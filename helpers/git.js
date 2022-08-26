function getJiraTaskId(branch) {
  const commitParts = (branch).split('/');
  return commitParts[commitParts.length - 1];
}

module.exports = {
  getJiraTaskId,
};
