import React from 'react';

export function ContactUsContent() {
  return (
    <div className="text-left">
      <p className="mb-3">
              DrawdownCalc was inspired by James Welch’s i-ORP (<a target="_blank" rel="noopener noreferrer" href="https://web.archive.org/web/20240221104111/http://i-orp.com/Plans/index.html">a snapshot of i-ORP</a> from the <a target="_blank" rel="noopener noreferrer" href="https://web.archive.org/">Wayback Machine</a>). DrawdownCalc started as a fork of <a target="_blank" rel="noopener noreferrer" href="https://github.com/wscott/fplan">Wayne Scott’s fplan</a>.
      </p>

      <h2 className="text-xl font-semibold mb-3">Version</h2>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-2 border border-gray-300 dark:border-gray-600">
                Date
              </th>
              <th scope="col" className="px-4 py-2 border border-gray-300 dark:border-gray-600">
                Release Notes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-top"><strong>10 June 2025</strong></td>
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">Initial Version<br/>Everything is new!</td>
            </tr>
            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-top"><strong>15 June 2025</strong></td>
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">Added standard deduction extra for ages 65+</td>
            </tr>
            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-top"><strong>26 November 2025</strong></td>
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">Updated tax brackets for 2026, updated ACA subsidy percentages</td>
            </tr>
            {/* You can add more rows here for future versions */}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mb-3">Contact</h2>
      <p className="mb-3">
              Email me at <a target="_blank" rel="noopener noreferrer" href="mailto:hubcity@drawdowncalc.com">hubcity@drawdowncalc.com</a>
      </p>

      <h2 className="text-xl font-semibold mb-3">Bug Reports</h2>
      <p className="mb-3">
        If you have found a general issue, send me an email or submit an issue to the corresponding project on GitHub:
      </p>
      <ul className="list-disc list-inside mb-3 space-y-1">
              <li><a target="_blank" rel="noopener noreferrer" href="https://github.com/hubcity/drawdowncalc/issues">DrawdownCalc</a> which deals with the math problem</li>
              <li><a target="_blank" rel="noopener noreferrer" href="https://github.com/hubcity/drawdowncalc_web/issues">DrawdownCalc_web</a> which draws the web pages</li>
      </ul>
      <p className="mb-3">
        If you have found a bug it would be very helpful if you could email me the form data that you were using when you found the bug.
      </p>

      <h2 className="text-xl font-semibold mb-3">Rambling Thoughts</h2>
      <p className="mb-3">
        Excuse me while I ramble on a bit with some thoughts on retirement withdrawals. I don’t imagine any of this is new. In fact, I suspect that much of it is obvious to a lot of people. But some of it is <i>so obvious</i> that I feel like it needs to be written down.
      </p>

      <h3 className="text-base font-semibold mb-2">Roth Conversions</h3>
      <p className="mb-3">
        <b>“A prepayment of taxes”</b> is, by far, the best way to think about Roth conversions. With the Roth conversion the federal government has given us a choice of when to pay taxes on retirement savings that have not yet been taxed. We can do a Roth conversion and pay taxes at the time of the conversion, or we can wait until we withdraw the money and pay taxes then. Naturally we should want to pay taxes when we are in lower tax brackets. The question of when to do a conversion is all about deciding when we will be in those lower brackets.
      </p>
      <p className="mb-3">
        <b>“Tax-free growth”</b> is the most misleading phrase used in regards to Roth conversions. That’s because tax-free growth <b>in isolation</b> is not a financial benefit. Let me try to explain by way of an example. Ted, the traditional IRA guy and Ron, the Roth proponent are both considering doing a Roth conversion of $10,000 this year. Ted decides not to do a conversion. When he withdraws the money in 10 years it has doubled and he owes taxes of 15%. So, taxes of 15% on the $20,000 (the original doubled) is $3,000. Ted will have $17,000 that he could spend. Ron does a conversion in the first year, he pays taxes of $1,500 and leaves the remaining $8,500 invested. Ron’s investment doubles after 10 years to $17,000. He doesn’t owe any taxes, since he prepaid them with his Roth conversion, so he has $17,000 to spend. Ron experienced 10 years of <b>tax-free growth</b>. I would argue that doesn’t matter in this case because they both ended up with the same amount of money to spend. Since the tax rate due (15%) at the time of the conversion was the same as the tax rate at the time of the withdrawal, doing a conversion and not doing a conversion were equivalent.
      </p>
      <p className="mb-3">
        The only reason a Roth conversion makes sense is if you will be paying a lower percentage of taxes on the conversion than you would have paid if you waited until you withdrew the money.
      </p>

      <h3 className="text-base font-semibold mb-2">Useless Conversions</h3>
      <p className="mb-3">
        DrawdownCalc does occasionally recommend Roth conversions that seem almost useless. These tend to be conversions that in the long run may save only a few dollars, perhaps by keeping the user out of a slightly higher state tax bracket years later. DrawdownCalc sometimes makes conversions in times where not making the conversion would be equivalent. That’s because DrawdownCalc is trying to solve a math problem - when two different actions both lead to the same outcome it doesn’t know how to choose between them and may simply return the answer it found first.
      </p>
      <p className="mb-3">
        I thought about trying to eliminate both of these types of useless (or almost useless) conversions. But I decided against that. The whole point of this exercise is to find out what the math tells you to do.
      </p>

      <h3 className="text-base font-semibold mb-2">Conventional Wisdom</h3>
      <p className="mb-3">
        In general the math of DrawdownCalc seems to match conventional wisdom. That’s good - I certainly hope that the conventional wisdom and the math match!
      </p>
      <p className="mb-3">
        The one area where the conventional wisdom and DrawdownCalc don’t quite match is that DrawdownCalc is willing to spend from the Roth account early instead of waiting until late in retirement. I believe that’s because DrawdownCalc, by assuming a constant rate of return on your investments, always knows exactly what tax bracket you are going to be in in the future. When you find yourself in the highest tax bracket you will ever see in retirement then you can spend from your Roth account without worry (your conversions have already had their maximum effect when you spend them during your highest tax bracket years). I imagine the reason the conventional wisdom tells you to refrain from spending from your Roth account is the worry that your investments will exceed your expectations and you will end up in a higher tax bracket.
      </p>

      <p className="mb-3">
        Ok, that’s it. I hope you find DrawdownCalc useful!
      </p>
    </div>
  );
}