require('dotenv').config();
const { execSync } = require('child_process');
const axios = require('axios');

const { GITHUB_TOKEN } = { ...process.env };

const args = process.argv.slice(2); // Skip the first two elements

const sourceTag = args[0];
const targetTag = args[1];

console.debug(`Source tag: ${sourceTag}`);
console.debug(`Target tag: ${targetTag}`);

function getGithubToken() {
  let tokenVarName = process.env.GITHUB_TOKEN_VAR_NAME; // Get the variable name from .env
  if (!tokenVarName) {
    console.info('The GITHUB_TOKEN_VAR_NAME environment variable is not defined. Using the default: GITHUB_TOKEN');
    tokenVarName = 'GITHUB_TOKEN'; // Use the default variable name
  }

  const token = process.env[tokenVarName]; // Access the token using the variable name
  if (!token) {
    console.error(`The GitHub token is not defined in the system's environment variables. \
      Based on your .env, ${tokenVarName} must be defined.`);
    process.exit(1);
  }

  return token;
}

function getRepoOwner() {
  const repoOwner = process.env.GITHUB_REPO_OWNER;

  if (!repoOwner) {
    console.error(`GITHUB_REPO_OWNER must be defined in the .env file.`);
    process.exit(1);
  }

  return repoOwner;
}

function getRepoName() {
  const repoName = process.env.GITHUB_REPO_NAME;

  if (!repoName) {
    console.error(`GITHUB_REPO_NAME must be defined in the .env file.`);
    process.exit(1);
  }

  return repoName;
}

console.log(`GITHUB_TOKEN is ${getGithubToken().length} characters in length.`);
console.log(`GITHUB_REPO_OWNER is ${getRepoOwner()}.`);
console.log(`GITHUB_REPO_NAME is ${getRepoName()}.`);

const execCommand = (command) => {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output.split('\n').filter(Boolean); // Split by new line and remove empty lines
  } catch (error) {
    console.error(`Error executing command '${command}':`, error);
    return [];
  }
};

const fetchReleaseNotes = async (tag) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${getRepoOwner()}/${getRepoName()}/releases/tags/${tag}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    return { tag, name: response.data.name, body: response.data.body };
  } catch (error) {
    console.error(`Error fetching release notes for tag ${tag}:`, error);
    return null;
  }
};

const main = async () => {
  // Fetch tags merged into start and end tags
  const endTagMerged = execCommand(`git tag --merged ${endTag}`);
  const startTagMerged = execCommand(`git tag --merged ${startTag}`);

  // Determine tags exclusive to the end tag
  const exclusiveTags = endTagMerged.filter(tag => !startTagMerged.includes(tag));

  // Fetch release notes for the tags exclusive to the end tag
  const releaseNotesPromises = exclusiveTags.map(tag => fetchReleaseNotes(tag));
  const releaseNotes = await Promise.all(releaseNotesPromises);

  // Log the release notes
  releaseNotes.forEach(release => {
    if (release) {
      console.log(`${release.name} (${release.tag})\n ${release.body}\n`);
    }
  });
};

main();

