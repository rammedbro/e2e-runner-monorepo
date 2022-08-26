const listBranches = jest.fn();
const mergeBranch = jest.fn();
const objectExists = jest.fn();
const getObject = jest.fn();
const putObject = jest.fn();
const branchExists = jest.fn();
const getObjectLink = jest.fn();

export const S3 = jest.fn().mockImplementation(() => ({
  listBranches,
  mergeBranch,
  objectExists,
  getObject,
  putObject,
  branchExists,
  getObjectLink
}));
