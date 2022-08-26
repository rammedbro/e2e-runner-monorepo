import fs from 'fs';
import tmp from 'tmp';
import nock from 'nock';

import { GitlabApi } from '~/src/classes/gitlab-api';
import type { IGitlabPipeline, IGitlabRelease, IGitlabJob } from '~/src/classes/gitlab-api';

describe('gitlab-api', () => {
  const privateToken = 'private-token';
  const projectId = 'project-id';
  const gitlabApi = new GitlabApi(projectId, privateToken);
  const scope = nock(gitlabApi.baseUrl);

  it('should get project releases', async () => {
    const expectedReleases: IGitlabRelease[] = [
      { tag_name: 'tag-name-1' },
      { tag_name: 'tag-name-2' },
    ];

    scope
      .get('/releases')
      .reply(200, expectedReleases);

    const responseReleases = await gitlabApi.getProjectReleases();

    expect(scope.isDone()).toEqual(true);
    expect(responseReleases).toEqual(expect.arrayContaining(expectedReleases));
  });

  it('should get all project pipelines', async () => {
    const expectedPipelines: IGitlabPipeline[] = [
      {
        id: 6765431,
        ref: 'release/20211212',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6765431'
      },
      {
        id: 6765432,
        ref: 'release/20211213',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6765432'
      },
      {
        id: 6765433,
        ref: 'release/20211214',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6765431'
      },
    ];

    scope
      .get('/pipelines')
      .reply(200, expectedPipelines);

    const responsePipelines = await gitlabApi.getProjectPipelines();

    expect(scope.isDone()).toEqual(true);
    expect(responsePipelines).toEqual(expect.arrayContaining(expectedPipelines));
  });

  it('should get project pipeline by id', async () => {
    const expectedPipeline: IGitlabPipeline = {
      id: 6765431,
      ref: 'release/20211212',
      created_at: new Date().toISOString(),
      web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6765431'
    };

    scope
      .get(`/pipelines/${expectedPipeline.id}`)
      .reply(200, expectedPipeline);

    const responsePipeline = await gitlabApi.getProjectPipeline(expectedPipeline.id);

    expect(scope.isDone()).toEqual(true);
    expect(responsePipeline).toMatchObject(expectedPipeline);
  });

  it('should get set query param to filter project pipelines by ref name', async () => {
    const expectedRef = 'release/20211212';

    scope
      .get('/pipelines')
      .query({ ref: expectedRef })
      .reply(200);

    await gitlabApi.getProjectPipelines(expectedRef);

    expect(scope.isDone()).toEqual(true);
  });

  it('should get pipeline jobs for a given page', async () => {
    const pipelineId = 0;
    const page = 2;
    const perPage = 50;

    scope
      .get(uri => uri.includes(`/pipelines/${pipelineId}/jobs`))
      .query({ page, per_page: perPage })
      .reply(200);

    await gitlabApi.getPipelineJobsPerPage(pipelineId, page, perPage);

    expect(scope.isDone()).toEqual(true);
  });

  it('should get pipeline jobs until x-next-page header is not empty', async () => {
    const pipelineId = 0;
    const jobs = [
      [
        {
          id: 0,
          name: 'job',
          status: 'success'
        },
        {
          id: 1,
          name: 'job',
          status: 'failed'
        }
      ],
      [
        {
          id: 2,
          name: 'job',
          status: 'success'
        },
        {
          id: 3,
          name: 'job',
          status: 'failed'
        }
      ],
      [
        {
          id: 4,
          name: 'job',
          status: 'success'
        },
        {
          id: 5,
          name: 'job',
          status: 'failed'
        }
      ]
    ];

    jobs.forEach((item, index) => {
      const page = index + 1;
      const nextPage = page + 1;
      scope
        .get(uri => uri.includes(`/pipelines/${pipelineId}/jobs`))
        .query({ page, per_page: 100 })
        .reply(200, item, {
          'x-next-page': page < jobs.length ? nextPage.toString() : ''
        });
    });

    const responseJobs = await gitlabApi.getPipelineJobsAll(pipelineId);
    const expectedJobs = jobs.reduce((acc, cur) => acc.concat(cur), []);

    expect(scope.isDone()).toEqual(true);
    expect(responseJobs).toEqual(expect.arrayContaining(expectedJobs));
  });

  it('should retry job and return new job info', async () => {
    const jobId = 0;
    const expectedJob: IGitlabJob = {
      id: 5,
      name: 'name',
      status: 'status',
      started_at: new Date().toISOString(),
      finished_at: null
    };

    scope
      .post(`/jobs/${jobId}/retry`)
      .reply(200, expectedJob);

    const responseJob = await gitlabApi.retryPipelineJob(jobId);

    expect(scope.isDone()).toEqual(true);
    expect(responseJob.id).not.toEqual(jobId);
    expect(responseJob).toMatchObject(expectedJob);
  });

  it('should get job artifacts and extract them on given path', async () => {
    const jobId = 0;
    const zipPath = 'packages/app/tests/resources/gitlab/OzAvatar-chrome-desktop.zip';
    scope
      .get(`/jobs/${jobId}/artifacts/`)
      .reply(200, () => fs.createReadStream(zipPath));

    const { name: outputPath } = tmp.dirSync({ unsafeCleanup: true });
    const responsePath = await gitlabApi.getJobArtifacts(jobId, outputPath);

    expect(scope.isDone()).toEqual(true);
    expect(fs.existsSync(responsePath)).toEqual(true);
  });
});
