const { getJUnitData } = require("./junit");
const { getCoverageData } = require("./coverage");
const { getReport } = require("./report");
const { getFileContent } = require("./utils");
const core = require("@actions/core");
const github = require('@actions/github');
const { addPullRequestComment } = require("./commentator");

const loadFile = (filePath, projectDir) => {
  if (!filePath) {
    return null;
  }

  filePath = filePath.startsWith("/") ? filePath : `${process.env.GITHUB_WORKSPACE}/${projectDir}/${filePath}`;
  return getFileContent(filePath);
}

const getPullRequestFilesUrl = (projectDir, projectCoverageDir) => {
  const { context, repository } = github;
  const { payload } = context;
  const { repo, owner } = context.repo;
  const _repository = repository || `${owner}/${repo}`
  const commit = payload.pull_request.head.sha;
  const suffix = projectDir && projectCoverageDir ? `${projectDir}/${projectCoverageDir}` : projectDir;
  return `https://github.com/${_repository}/blob/${commit}/${suffix}`;
}

const generateReport = (
  junitFileContent, 
  coverageFileContent, 
  customTemplateFileContent, 
  projectName,
  projectDir,
  projectCoverageDir
) => {
  const repositoryUrl = getPullRequestFilesUrl(projectDir, projectCoverageDir);
  const coverageData = getCoverageData(coverageFileContent);
  const junitData = getJUnitData(junitFileContent);
  return getReport(junitData, coverageData, repositoryUrl, customTemplateFileContent, projectName);
}

async function main() {
  console.log("--- junit coverage report ---");

  const { context } = github;
  const { eventName } = context;
  if (eventName === "pull_request") {
    console.log("--- junit coverage report: pull request event ---");
    const token = core.getInput("github-token", { required: true });
    const junitPath = core.getInput("junit-path", { required: false });
    const coveragePath = core.getInput("coverage-path", { required: false });
    const templatePath = core.getInput("template-path", { required: false });
    const projectDir = core.getInput("project-dir", { required: false });
    const projectName = core.getInput("project-name", { required: false });
    const projectCoverageDir = core.getInput("project-coverage-dir", { required: false });

    const junitFileContent = loadFile(junitPath, projectDir);
    const coverageFileContent = loadFile(coveragePath, projectDir);
    const customTemplateFileContent = loadFile(templatePath);

    const report = generateReport(
      junitFileContent,
      coverageFileContent,
      customTemplateFileContent,
      projectName,
      projectDir,
      projectCoverageDir
    );
    console.log("report: ");
    console.log(report);
    await addPullRequestComment(token, report, projectName);
  }
}

main().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
