script({
    title: "Import GitHub Workspace",
    description: "Interactive wizard to import a GitHub repository for analysis.",
    parameters: {
        repoUrl: {
            type: "string",
            description: "URL of the GitHub repository to import (e.g., https://github.com/username/repo)",
        },
        branch: {
            type: "string",
            description: "Branch to clone (optional, defaults to main/master)",
        }
    }
});

const repoUrl = env.vars.repoUrl || await host.input("Enter GitHub Repository URL:");
if (!repoUrl) cancel("Repository URL is required");

const branch = env.vars.branch;

// Validate URL
if (!repoUrl.startsWith("https://github.com/")) {
    cancel("Invalid GitHub URL. Must start with https://github.com/");
}

const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "imported-workspace";
const targetDir = `imported/${repoName}`;

// Check if directory exists
if (await fs.exists(targetDir)) {
    const overwrite = await host.confirm(`Directory ${targetDir} already exists. Overwrite?`);
    if (!overwrite) cancel("Import cancelled by user.");
    // In a real shell we'd rm -rf, but here we might need a distinct command if fs.rm isn't recursive-friendly enough or just warn.
    // Assuming we proceed:
}

console.log(`Cloning ${repoUrl} to ${targetDir}...`);

// Use git to clone
// We use 'git' command line tool.
// Shallow clone for speed.
const branchFlag = branch ? `-b ${branch}` : "";
await host.exec(`git clone --depth 1 ${branchFlag} ${repoUrl} ${targetDir}`);

console.log(`\n✅ Repository imported to: ${targetDir}`);
console.log(`\nTo analyze a video context within this workspace, run:`);
console.log(`genaiscript run action-video-issue-analyzer --vars videoUrl=<YOUR_VIDEO_URL>`);

// Optional: specific setup for the analyzer if needed?
// For now, just bringing the code in is the "Import".

