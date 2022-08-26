const path = require('path');

class TotalCoverageReporter {
  constructor(globalConfig) {
    this.globalConfig = globalConfig;
  }

  onRunComplete() {
    const { collectCoverage, coverageDirectory } = this.globalConfig;

    if (!collectCoverage) return;

    const coveragePath = path.join(coverageDirectory, 'coverage-summary.json');
    const coverage = require(coveragePath);
    const coverageSum = ['lines', 'statements', 'functions', 'branches']
      .map(i => coverage.total[i].pct)
      .reduce((a, b) => a + b, 0);
    const totalCoverage = coverageSum / 4;

    // Gitlab Regex: Total Coverage: (\d+\.\d+\%)
    console.log('========= Total Coverage ============');
    console.log(`Total Coverage: ${totalCoverage.toFixed(2)}%`);
    console.log('=====================================');
  }
}

module.exports = TotalCoverageReporter;
