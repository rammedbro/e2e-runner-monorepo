const getLastOpenedReport = jest.fn();
const getAllOpenedReports = jest.fn();
const checkReport = jest.fn();
const notifyReport = jest.fn();
const getReportLink = jest.fn();
const sendReport = jest.fn();
const closeReport = jest.fn();
const reportsDir = 'reports';

export const ScreenshotsReporter = jest.fn().mockImplementation(() => ({
  reportsDir,
  getLastOpenedReport,
  getAllOpenedReports,
  checkReport,
  notifyReport,
  getReportLink,
  sendReport,
  closeReport,
}));
