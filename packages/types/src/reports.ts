interface IReporterConfig {
  name: string;
  channelId: string;
  defaultUsers: IReportUser[];
  groups?: IReportGroup[];
}

export interface IReportGroup {
  id: string;
  users: IReportUser[];
  tag?: string;
}

export interface IReportUser {
  id: string;
  tag?: string;
}

export interface ISlackReporterConfig extends IReporterConfig {
  name: 'slack';
  appId?: string;
  botToken?: string;
}
