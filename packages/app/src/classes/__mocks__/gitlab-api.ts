const getProjectReleases = jest.fn();
const getPipelineJobsPerPage = jest.fn();
const getPipelineJobsAll = jest.fn();
const getJobArtifacts = jest.fn();
const retryPipelineJob = jest.fn();
const getProjectPipelines = jest.fn();
const getProjectPipeline = jest.fn();

export const GitlabApi = jest.fn().mockImplementation(() => ({
  getProjectReleases,
  getPipelineJobsPerPage,
  getPipelineJobsAll,
  getJobArtifacts,
  retryPipelineJob,
  getProjectPipelines,
  getProjectPipeline
}));
