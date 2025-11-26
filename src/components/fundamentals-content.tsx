import React from 'react';

export function FundamentalsContent() {
  return (
    <div className="text-left">
      <p className="mb-3">
        I'd like to be as clear as I can be about what DrawdownCalc does and does not do.  
      </p>
      <h2 className="text-xl font-semibold mb-3">Omissions</h2>
      <p className="mb-3">
        Let’s start by talking about what DrawdownCalc doesn’t do.
      </p>
      <p className="mb-3">
        Here is a certainly incomplete list of current or future life situations not currently supported by DrawdownCalc:
      </p>
      <ul className="list-disc list-inside mb-3 space-y-1">
        <li>A spouse with their own retirement accounts</li>
        <li>The complexities of taking social security as a couple</li>
        <li>Moving to a different state during retirement</li>
        <li>A mid-retirement change in tax status</li>
      </ul>
      <p className="mb-3">
        Here is an incomplete list of financial concepts or concerns that are currently ignored or unimplemented by DrawdownCalc:
      </p>
      <ul className="list-disc list-inside mb-3 space-y-1">
        <li>Medicaid</li>
        <li>HSA</li>
        <li>AMT</li>
        <li>Itemized deductions</li>
        <li>Capital losses</li>
        <li>IRMAA</li>
        <li>Medicare premiums</li>
        <li>ACA cost sharing subsidies (not the same thing as ACA premium subsidies)</li>
        <li>Additional income in retirement</li>
      </ul>
        <p></p>
      <h2 className="text-xl font-semibold mb-3">Calculation</h2>
      <p className="mb-3">
        DrawdownCalc turns the question of how to efficiently manage your money in your retirement accounts into a mixed-integer linear programming math problem. Doing that means that there are some limitations on what can be computed and additional limitations on what can be computed quickly. Here are some of the areas where DrawdownCalc makes compromises regarding what it computes:
      </p>

      <h3 className="text-base font-semibold mb-2">Capital Gains Taxes</h3>
      <p className="mb-3">
        How much tax is owed on the sale of stocks or mutual funds seems like a fairly straightforward calculation. There are different ways to compute the taxes owed on a sale. All of them require the calculation of a cost basis. Many mutual funds use an average cost basis. That’s what DrawdownCalc would prefer to use (especially since other methods, like specific lot basis, would require collecting a lot more information from the user). Unfortunately, computing the average cost basis is not a calculation that fits into a linear programming model. As an alternative, DrawdownCalc calculates the cost basis as if the sale associated with a brokerage withdrawal is the first sale that has ever happened in that account. This will be inaccurate for every withdrawal except the first one. So it’s wrong, but it’s the least wrong calculation that DrawdownCalc has found.
      </p>

      <h3 className="text-base font-semibold mb-2">ACA Premium Subsidies</h3>
      <p className="mb-3">
        The IRS calculation of ACA premium subsidies is based on a sliding scale depending on the user’s AGI as a percentage of the Federal Poverty Level (FPL). Implementing such a sliding scale in an MiLP is not simple. DrawdownCalc has chosen to implement a stair-step type estimate that sometimes underestimates the subsidy available.  The current version of DrawdownCalc assumes that the subsidy rules in place in 2026 will continue to be in place in the future.
      </p>

      <h3 className="text-base font-semibold mb-2">Roth Withdrawal Rules</h3>
      <p className="mb-3">
        The IRS rules for withdrawals from Roth accounts are surprisingly complex. DrawdownCalc does not implement those rules. DrawdownCalc allows full access to Roth balances if the user is older than 59.5 and the account has been open for at least 5 years. Otherwise access is limited to those additions to the account that are at least 5 years old. These rules, while more strict than the IRS rules, were relatively simple to implement. The IRS also allows early withdrawals with penalties under certain circumstances. DrawdownCalc does not support those scenarios.
      </p>

      <h3 className="text-base font-semibold mb-2">Taxability of Social Security</h3>
      <p className="mb-3">
        DrawdownCalc assumes that 85% of all social security benefits are subject to tax. This will be inaccurate for users with a low AGI.
      </p>

      <h2 className="text-xl font-semibold mb-3">Assumptions</h2>
      <p className="mb-3">
        DrawdownCalc makes a number of assumptions about the user's behavior and the financial world when making its calculations.
      </p>
      <h3 className="text-base font-semibold mb-2">User</h3>
      <p className="mb-3">
        The user makes all withdrawals at the beginning of the year.  The exception to this is the year the user turns 59.5.  That year DrawdownCalc assumes that the user makes withdrawals at a time of the year when early withdrawal penalties will not apply.
      </p>
      <p className="mb-3">
        Taxes are due on automatic brokerage distributions in the year they are received. These automatic brokerage distributions are determined by the "Distributions" value the user supplies in the form.  These are often year-end distributions.  Although they are taxed in the year they are received, DrawdownCalc assumes the user doesn't spend them until the following year.
      </p>      
      <h3 className="text-base font-semibold mb-2">Financial</h3>
      <p className="mb-3">
        The numbers that denote the beginning and end of each tax bracket are assumed to increase with inflation.  The start of the application of the NII tax does not change with inflation because the law that implements it is not indexed to inflation.
      </p>
      <p className="mb-3">
        Inflation is calculated as if it occurs at the stroke of midnight the night of New Year's Eve.
      </p>
      <h2 className="text-xl font-semibold mb-3">Summary</h2>
      <p className="mb-3">
        This page highlights some issues, but for all of the details you can check the <a target="_blank" rel="noopener noreferrer" href="https://github.com/hubcity/drawdowncalc">source code at GitHub</a>.
      </p>

    </div>
  );
}