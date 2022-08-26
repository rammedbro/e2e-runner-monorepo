/* eslint-disable camelcase */
import fs from 'fs';
import path from 'path';
import type { AxiosInstance, AxiosError } from 'axios';
import axios from 'axios';
import type * as Stream from 'stream';
import AdmZip from 'adm-zip';

import { GitlabApiError } from '~/src/classes/error';
import { ensureDirExists } from '~/src/utils/fs';

export interface IGitlabRelease {
  tag_name: string;
}

export interface IGitlabPipeline {
  id: number;
  ref: string;
  created_at: string;
  web_url: string;
}

export interface IGitlabJob {
  id: number;
  name: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

export class GitlabApi {
  public baseUrl: string;
  private readonly axios: AxiosInstance;

  constructor(projectId: string, privateToken: string) {
    this.baseUrl = `https://gitlab.ozon.ru/api/v4/projects/${projectId}`;
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'PRIVATE-TOKEN': privateToken
      }
    });

    const onRejectedCallback = (error: AxiosError) => Promise.reject(new GitlabApiError(error.message));

    this.axios.interceptors.request.use(undefined, onRejectedCallback);
    this.axios.interceptors.response.use(undefined, onRejectedCallback);
  }

  public async getProjectReleases(): Promise<IGitlabRelease[]> {
    const { data: releases } = await this.axios.get<IGitlabRelease[]>('/releases');
    return releases;
  }

  public async getProjectPipelines(ref?: string): Promise<IGitlabPipeline[]> {
    const { data: pipelines } = await this.axios.get<IGitlabPipeline[]>('/pipelines', {
      params: { ref }
    });

    return pipelines;
  }

  public async getProjectPipeline(id: number | string): Promise<IGitlabPipeline> {
    const { data: pipeline } = await this.axios.get<IGitlabPipeline>(`/pipelines/${id}`);
    return pipeline;
  }

  public async getPipelineJobsPerPage(
    id: number | string,
    page = 1,
    perPage = 100
  ): Promise<IGitlabJob[]> {
    const { data: jobs } = await this.axios.get<IGitlabJob[]>(
      `/pipelines/${id}/jobs`, {
        params: {
          page,
          per_page: perPage,
        }
      });

    return jobs;
  }

  public async getPipelineJobsAll(id: number | string): Promise<IGitlabJob[]> {
    const jobs: IGitlabJob[] = [];
    let nextPage: number | null = 1;

    while (nextPage !== null) {
      const response = await this.axios.get<IGitlabJob[]>(
        `/pipelines/${id}/jobs`, {
          params: {
            page: nextPage,
            per_page: 100,
          }
        });
      const headers = response.headers as Record<string, string>;

      jobs.push(...response.data);
      nextPage = headers['x-next-page'] ? Number(headers['x-next-page']) : null;
    }

    return jobs;
  }

  public async retryPipelineJob(id: number | string): Promise<IGitlabJob> {
    const { data: job } = await this.axios.post<IGitlabJob>(`/jobs/${id}/retry`);
    return job;
  }

  public async getJobArtifacts(
    id: number | string,
    outputPath: string,
    artifactPath = ''
  ): Promise<string> {
    const response = await this.axios.get<Stream>(`/jobs/${id}/artifacts/${artifactPath}`, {
      responseType: 'stream'
    });
    const tempDir = fs.mkdtempSync(this.constructor.name);
    const tempFilePath = path.join(tempDir, id.toString());
    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    await new Promise<void>(((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    }));

    ensureDirExists(outputPath);
    const zip = new AdmZip(tempFilePath);
    const entry = zip.getEntries()[0];
    zip.extractAllTo(outputPath);
    fs.rmdirSync(tempDir, { recursive: true });

    return path.join(outputPath, entry.entryName);
  }
}
