
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, TimeToFix } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// In-memory cache implementation
interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}
const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour

const timeToFixValues: TimeToFix[] = ['Quick (< 1 hour)', 'Medium (1-4 hours)', 'Complex (> 4 hours)'];

const sourceSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of the source document." },
        url: { type: Type.STRING, description: "The direct URL to the source." },
    },
    required: ["title", "url"],
};

const executiveSummarySchema = {
    type: Type.OBJECT,
    properties: {
        overview: {
            type: Type.STRING,
            description: "A high-level overview of the repository's security posture, written for a leadership audience."
        },
        prioritizedActions: {
            type: Type.ARRAY,
            description: "A prioritized list of actions to take, ranked from most to least important.",
            items: {
                type: Type.OBJECT,
                properties: {
                    rank: { type: Type.INTEGER, description: "The priority rank of the action (1 is highest)." },
                    title: { type: Type.STRING, description: "A brief, scannable title for the action item (e.g., 'Hardcoded API Key Found')." },
                    vulnerabilityDescription: { type: Type.STRING, description: "A more detailed summary of the vulnerability." },
                    fileName: { type: Type.STRING, description: "The file where the vulnerability exists." },
                    riskRationale: { type: Type.STRING, description: "The rationale for the ranking, using a risk model (e.g., Impact x Likelihood). Explain why it's a priority." },
                    severity: { type: Type.STRING, description: "The severity of the vulnerability (Critical, High, Medium, Low, Informational)." },
                    timeToFix: { type: Type.STRING, description: `An estimate of the time required to fix the vulnerability. Must be one of: ${timeToFixValues.join(', ')}.` },
                },
                required: ["rank", "title", "vulnerabilityDescription", "fileName", "riskRationale", "severity", "timeToFix"],
            }
        }
    },
    required: ["overview", "prioritizedActions"]
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        vulnerabilities: {
            type: Type.ARRAY,
            description: "A list of security vulnerabilities found in the code and IaC files.",
            items: {
                type: Type.OBJECT,
                properties: {
                    fileName: { type: Type.STRING, description: "The path of the file where the vulnerability was found." },
                    line: { type: Type.INTEGER, description: "The approximate line number of the vulnerability." },
                    severity: { type: Type.STRING, description: "The severity of the vulnerability (Critical, High, Medium, Low, Informational)." },
                    description: { type: Type.STRING, description: "A clear and concise description of the vulnerability." },
                    recommendation: { type: Type.STRING, description: "A detailed recommendation on how to fix the vulnerability, including code snippets if applicable." },
                    timeToFix: { type: Type.STRING, description: `An estimate of the time required to fix the vulnerability. Must be one of: ${timeToFixValues.join(', ')}.` },
                    sources: {
                        type: Type.ARRAY,
                        description: "A list of credible, authoritative sources for the recommendation.",
                        items: sourceSchema
                    },
                },
                required: ["fileName", "severity", "description", "recommendation", "timeToFix", "sources"],
            },
        },
        holisticRecommendations: {
            type: Type.ARRAY,
            description: "A list of high-level recommendations for improving the overall security posture.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A short title for the recommendation." },
                    description: { type: Type.STRING, description: "A detailed description of the holistic recommendation." },
                    sources: {
                        type: Type.ARRAY,
                        description: "A list of credible, authoritative sources for the recommendation.",
                        items: sourceSchema
                    },
                },
                required: ["title", "description", "sources"],
            },
        },
        executiveSummary: executiveSummarySchema,
    },
    required: ["vulnerabilities", "holisticRecommendations", "executiveSummary"],
};

const CODE_FILE_EXTENSIONS = [
    // IaC
    '.tf', '.tfvars', 'dockerfile', '.yml', '.yaml', 
    // General code
    '.js', '.ts', '.py', '.go', '.java', '.rb', '.php', '.cs', '.c', '.cpp', '.h', '.hpp',
    // Configs
    '.json', '.xml', '.ini', '.toml', '.sh'
];

const EXCLUDED_DIRECTORIES = ['node_modules', 'dist', 'build', 'vendor', '.git', '.vscode', 'target'];

interface GitHubFile {
  path: string;
  url: string;
}

const parseRepoUrl = (url: string): { owner: string; repo: string } => {
  try {
    const urlObject = new URL(url);
    if (urlObject.hostname !== 'github.com') {
      throw new Error("URL is not for github.com");
    }
    const pathParts = urlObject.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error("URL path does not contain owner and repo");
    }
    const [owner, repo] = pathParts;
    return { owner, repo: repo.replace(/\.git$/, '') };
  } catch (e) {
    throw new Error("Invalid GitHub repository URL. Please use a format like https://github.com/owner/repo.");
  }
};

const githubApiFetch = async (url: string, errorMessage: string) => {
    const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github+json' }
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Repository not found. Please check the URL and ensure it's a public repository.`);
        }
        if (response.status === 403) {
            const rateLimitReset = response.headers.get('x-ratelimit-reset');
            const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString() : 'in a while';
            throw new Error(`GitHub API rate limit exceeded. Please try again after ${resetTime}.`);
        }
        throw new Error(`${errorMessage}: ${response.statusText}`);
    }
    return response.json();
}

const getRepoDefaultBranch = async (owner: string, repo: string): Promise<string> => {
    const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const data = await githubApiFetch(repoApiUrl, 'Failed to fetch repository details');
    return data.default_branch;
};

const getRepoFiles = async (owner: string, repo: string, branch: string): Promise<GitHubFile[]> => {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const data = await githubApiFetch(treeUrl, 'Failed to fetch repository tree');

  if (data.truncated) {
      console.warn("Repository is too large, analysis may be incomplete.");
  }
  
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  return data.tree
    .filter((node: any) => {
        const path = node.path.toLowerCase();
        const isBlob = node.type === 'blob';
        const isNotSymlink = node.mode !== '120000';
        const isNotTooLarge = !node.size || node.size <= MAX_FILE_SIZE_BYTES;
        const hasValidExtension = CODE_FILE_EXTENSIONS.some(ext => path.endsWith(ext));
        const isNotExcluded = !EXCLUDED_DIRECTORIES.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`));

        if (isBlob && hasValidExtension && isNotExcluded && !isNotTooLarge) {
            console.warn(`Skipping large file: ${node.path} (${node.size ? (node.size / (1024*1024)).toFixed(2) : 'unknown'}MB)`);
        }
        return isBlob && isNotSymlink && isNotTooLarge && hasValidExtension && isNotExcluded;
    })
    .map((node: any) => ({ path: node.path, url: node.url }));
};

const getFileContent = async (file: GitHubFile): Promise<{ path: string; content: string }> => {
  const data = await githubApiFetch(file.url, `Failed to fetch file content for ${file.path}`);

  if (typeof data.content !== 'string') {
    throw new Error(`Invalid content response for file ${file.path}. The file might be too large or empty.`);
  }

  // Content is base64 encoded
  const content = atob(data.content);
  return { path: file.path, content };
};


const buildPrompt = (files: { path: string; content: string }[]): string => {
  const fileContents = files.map(file => `
--- FILE START: ${file.path} ---
${file.content}
--- FILE END: ${file.path} ---
`).join('\n\n');

  return `
You are "IaC Guardian", an expert in application security (AppSec) and Infrastructure as Code (IaC) security. Your task is to perform a comprehensive security audit of the provided source code and configuration files from a public GitHub repository.

**CONTEXT:**
The user has provided a GitHub repository for analysis. The following files and their contents have been extracted from it:
${fileContents}

**INSTRUCTIONS:**
1.  **Thoroughly Scan:** Analyze all provided files for a wide range of security vulnerabilities. This includes, but is not limited to:
    *   **IaC Misconfigurations:** Insecure defaults, overly permissive IAM roles, exposed network ports, missing encryption (for Terraform, Dockerfiles, Kubernetes YAML, etc.).
    *   **Application Vulnerabilities:** SQL Injection, Cross-Site Scripting (XSS), Insecure Deserialization, Server-Side Request Forgery (SSRF), and other OWASP Top 10 vulnerabilities.
    *   **Secrets Management:** Hardcoded secrets, API keys, passwords, or private keys.
    *   **Dependency Issues:** Mention if you see obviously vulnerable dependency versions (if visible in manifest files).
    *   **General Best Practices:** Deviations from secure coding and configuration best practices.
2.  **Identify Vulnerabilities:** For each issue found:
    *   Provide the file path, approximate line number, and a severity rating ('Critical', 'High', 'Medium', 'Low', 'Informational').
    *   Write a clear, concise description of the vulnerability and the potential impact.
    *   Provide a detailed, actionable recommendation for fixing it, including secure code examples where applicable.
    *   **Estimate Time to Fix:** Provide an estimated time to fix for each vulnerability. You MUST use one of these exact values: 'Quick (< 1 hour)', 'Medium (1-4 hours)', 'Complex (> 4 hours)'.
3.  **Provide Holistic Recommendations:** After analyzing individual files, provide high-level recommendations to improve the overall security posture of the entire system (e.g., implementing a secrets management system, adding CI/CD security scanning).
4.  **Cite Credible Sources:** For EACH vulnerability recommendation and holistic recommendation, you MUST cite at least one credible, authoritative source. Sources MUST be official documentation, well-respected security frameworks (e.g., CIS Benchmarks, OWASP), or official vendor security blogs. Provide a title and a direct URL for each source.
5.  **Generate an Executive Summary:** Create a dedicated "executiveSummary" section for a leadership audience.
    *   **Overview:** Write a high-level overview of the repository's security posture.
    *   **Prioritized Action Plan:** Identify the most critical vulnerabilities and create a prioritized list of actions, ranked from most to least important. For each action, include a brief 'title', 'vulnerabilityDescription', its 'fileName', 'severity', a 'riskRationale', and the estimated 'timeToFix'.
    *   **Risk Prioritization Rationale:** Prioritize using a risk-based model (Risk = Impact x Likelihood). Explain this in the 'riskRationale' field.
6.  **Format Output:** You MUST provide your response in the specified JSON format, adhering strictly to the provided schema. Do not output any text outside of the JSON structure.
`;
};

export const analyzeGitHubRepository = async (repoUrl: string): Promise<AnalysisResult> => {
  // 1. Check cache for a valid entry
  const cachedEntry = analysisCache.get(repoUrl);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
    console.log(`Returning cached result for ${repoUrl}`);
    return Promise.resolve(cachedEntry.result);
  }
  
  // 2. If not in cache or expired, proceed with the analysis
  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    const branch = await getRepoDefaultBranch(owner, repo);
    const filesToAnalyze = await getRepoFiles(owner, repo, branch);

    if (filesToAnalyze.length === 0) {
        const noFilesResult: AnalysisResult = { 
            vulnerabilities: [], 
            holisticRecommendations: [{
                title: "No Analyzable Code Files Found",
                description: "We couldn't find any common source code or Infrastructure as Code files (like Python, JavaScript, Terraform, Dockerfile, Kubernetes YAML) in this repository to analyze.",
                sources: []
            }],
            executiveSummary: {
                overview: "No analyzable source code or IaC files were found in the repository, so no security analysis could be performed. Please ensure the repository contains supported file types.",
                prioritizedActions: []
            }
        };
        // Cache this result to avoid re-fetching
        analysisCache.set(repoUrl, { result: noFilesResult, timestamp: Date.now() });
        return noFilesResult;
    }

    // Fetch file contents concurrently, but gracefully handle individual failures.
    const fileContentPromises = filesToAnalyze.map(file => 
        getFileContent(file).catch(err => {
            console.warn(`Skipping file due to fetch error: ${file.path}. Error: ${err.message}`);
            return null; // Return null for failed files to filter them out later.
        })
    );
    const resolvedContents = await Promise.all(fileContentPromises);
    const fileContents = resolvedContents.filter((content): content is { path: string; content: string } => content !== null);
    
    if (fileContents.length === 0) {
        throw new Error("Could not retrieve content for any of the IaC files found. This may be due to repository permissions, file sizes, or network issues.");
    }


    const prompt = buildPrompt(fileContents);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result: AnalysisResult = JSON.parse(cleanJsonText);
    
    if (!result.vulnerabilities || !result.holisticRecommendations || !result.executiveSummary) {
      throw new Error("Invalid response format from API. Missing key sections.");
    }

    // 3. Cache the new, valid result
    analysisCache.set(repoUrl, { result, timestamp: Date.now() });
    console.log(`Cached new analysis for ${repoUrl}`);

    return result;

  } catch (error) {
    console.error("Error during repository analysis:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while analyzing the repository.");
  }
};
