"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { DrawdownPlanYear, FederalTaxData, StateTaxData, TaxBracketTuple } from "@/services/drawdown-plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const COLORS_SPENDING = ['#4E8BAF', '#76C0C0', '#8FBC8F', '#A9A9A9', '#5F9EA0', '#696969'];
const COLORS = ['#D98B5F', '#E0B550', '#8F8F4C', '#708090', '#B38CB4', '#9370DB'];
const COLORS_OTHER = ['#191970', '#006400', '#8B0000', '#483D8B', '#B8860B', '#595959'];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatYAxis = (val: number | { valueOf(): number; }) => {
  const value = typeof val === 'number' ? val : val.valueOf();
  if (value >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 1000000) + 'M';
  } else if (value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 1000) + 'K';
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  }
};

function toCsv(data: DrawdownPlanYear[] | null): string {
  if (!data || data.length === 0) {
    return '';
  }

  const header = Object.keys(data[0]).join(',');
  const rows = data.map(item => Object.values(item).join(','));
  return `${header}\n${rows.join('\n')}`;
}

function downloadCsv(data: DrawdownPlanYear[] | null) {
  const csvData = toCsv(data);
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawdown_plan.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

interface DrawdownChartsProps {
  drawdownPlan: DrawdownPlanYear[];
  federalTaxData: FederalTaxData | null;
  stateTaxData: StateTaxData | null;
  cardMilestoneMessages: string[];
  isFormEdited: boolean;
  currentObjectiveType: string | undefined;
  spendingFloor: number | undefined;
  endOfPlanAssets: number | undefined;
}

export default function DrawdownCharts({
  drawdownPlan,
  federalTaxData,
  stateTaxData,
  cardMilestoneMessages,
  isFormEdited,
  currentObjectiveType,
  spendingFloor,
  endOfPlanAssets,
}: DrawdownChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<HTMLDivElement>(null);
  const spendingChartRef = useRef<HTMLDivElement>(null);
  const incomeTypeChartRef = useRef<HTMLDivElement>(null);
  const automaticIncomeChartRef = useRef<HTMLDivElement>(null);
  const stateAgiAndCgChartRef = useRef<HTMLDivElement>(null);
  const generalSpendingConstantDollarsChartRef = useRef<HTMLDivElement>(null);
  const withdrawalsLineChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drawdownPlan && chartRef.current && incomeChartRef.current
      && spendingChartRef.current && incomeTypeChartRef.current
      && automaticIncomeChartRef.current
      && stateAgiAndCgChartRef.current
      && generalSpendingConstantDollarsChartRef.current
      && withdrawalsLineChartRef.current) {
      
      // Clear previous charts
      d3.select(chartRef.current).select("svg").remove();
      d3.select(incomeChartRef.current).select("svg").remove();
      d3.select(spendingChartRef.current).select("svg").remove();
      d3.select(incomeTypeChartRef.current).select("svg").remove();
      d3.select(generalSpendingConstantDollarsChartRef.current).select("svg").remove();
      d3.select(automaticIncomeChartRef.current).select("svg").remove();
      d3.select(stateAgiAndCgChartRef.current).select("svg").remove();
      d3.select(withdrawalsLineChartRef.current).select("svg").remove();

      const data = drawdownPlan;
      const margin = { top: 40, right: 60, bottom: 60, left: 90 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const tooltip = d3.select("#chart-tooltip");

      const formatKey = (key: string) => {
        return key.replace(/_/g, ' ');
      };

      const createLineChart = (
        ref: React.RefObject<HTMLDivElement | null> | null,
        yLabel: string,
        dataKeys: (keyof DrawdownPlanYear)[],
        lineColors: string[]
      ) => {
        if (!data || data.length === 0 || !ref?.current) return;

        const yMax = d3.max(data, d => {
          let maxVal = 0;
          dataKeys.forEach(key => {
            const val = d[key] as number;
            if (val > maxVal) maxVal = val;
          });
          return maxVal;
        }) || 0;

        const svg = d3.select(ref.current)
          .append("svg")
          .attr("width", '90%')
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
          .domain(d3.extent(data, d => d.age) as [number, number])
          .range([0, width]);

        const y = d3.scaleLinear()
          .domain([0, yMax])
          .nice()
          .range([height, 0]);

        svg.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
          .call(d3.axisLeft(y).tickFormat(formatYAxis));

        dataKeys.forEach((key, i) => {
          const line = d3.line<DrawdownPlanYear>()
            .x(d => x(d.age))
            .y(d => y(d[key] as number));

          svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", lineColors[i % lineColors.length])
            .attr("stroke-width", 3)
            .attr("d", line);

          svg.selectAll(`.dot-${key}`)
            .data(data)
            .enter().append("circle")
            .attr("class", `dot-${key}`)
            .attr("cx", d => x(d.age))
            .attr("cy", d => y(d[key] as number))
            .attr("r", 10)
            .style("fill", lineColors[i % lineColors.length])
            .style("fill-opacity", 0.0)
            .style("opacity", 0.0)
            .on("mouseover", (event, d_point) => {
              tooltip.transition().duration(200).style("opacity", .9);
              tooltip.html(`<strong>Age:</strong> ${d_point.age}<br/><strong>${formatKey(key as string)}:</strong> ${formatCurrency(d_point[key] as number)}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
              tooltip.transition().duration(500).style("opacity", 0);
            });
        });

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(yLabel);
      };

      const createStackedBarChart = (
        ref: React.RefObject<HTMLDivElement | null> | null, 
        yMax: number, 
        yLabel: string, 
        dataKeys: string[], 
        colors: string[], 
        yFormat = d3.formatPrefix(".1", 1e3),
        chartHeight = height,
        customMargins?: { top: number; right: number; bottom: number; left: number }
      ) => {
        const margin = customMargins || { top: 40, right: 60, bottom: 60, left: 90 };
        if (!ref?.current) return;
        const svg = d3.select(ref.current)
          .append("svg")
          .attr("width", '90%')
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${chartHeight + margin.top + margin.bottom}`)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
          .domain(data.map(d => d.age.toString()))
          .range([0, width])
          .padding(0.1);

        const y = d3.scaleLinear()
          .domain([0, yMax])
          .nice()
          .range([chartHeight, 0]);

        const stack = d3.stack()
          .keys(dataKeys);

        const stackableData = data.map(d =>
          dataKeys.reduce<{ [key: string]: number }>((acc, key) => {
            acc[key] = (d[key as keyof DrawdownPlanYear] as number) || 0;
            (acc as any).age = d.age;
            return acc;
          }, {})
        );

        const stackedData = stack(stackableData);

        svg.selectAll(".series")
          .data(stackedData)
          .enter().append("g")
          .attr("class", "series")
          .style("fill", (d, i) => colors[i])
          .selectAll("rect")
          .data(d => d)
          .enter().append("rect")
          .attr("x", d => x(d.data.age.toString()) || "0")
          .attr("y", d => y(d[1]))
          .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
          .attr("width", x.bandwidth())
          .on("mouseover", function(event, d_segment) {
            const segmentValue = d_segment[1] - d_segment[0];
            const seriesIndex = stackedData.findIndex(series => series.some(segment => segment === d_segment));
            const segmentKey = dataKeys[seriesIndex] || "Unknown";
            
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<strong>Age:</strong> ${d_segment.data.age}<br/><strong>${formatKey(segmentKey)}:</strong> ${formatCurrency(segmentValue)}`)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 28) + "px");
           })
          .on("mouseout", function() {
            tooltip.transition()
                   .duration(500)
                   .style("opacity", 0);
          });
        
        data.forEach(d_item => {
          let total = 0;
          dataKeys.forEach(key => {
            total += (d_item[key as keyof DrawdownPlanYear] as number) || 0;
          });

          svg.append("rect")
            .attr("x", x(d_item.age.toString()) || "0")
            .attr("y", y(total) - margin.top/2.0)
            .attr("width", x.bandwidth())
            .attr("height", margin.top/2.0)
            .style("fill", "transparent")
            .on("mouseover", (event) => {
              tooltip.transition().duration(200).style("opacity", .9);
              tooltip.html(`<strong>Age:</strong> ${d_item.age}<br/><strong>Total:</strong> ${formatCurrency(total)}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
              tooltip.transition().duration(500).style("opacity", 0);
            });
        });

        svg.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          .call(d3.axisBottom(x).tickSize(0).tickPadding(10));

        svg.append("g")
          .call(d3.axisLeft(y).tickFormat(yFormat));

        svg.append("text")
          .attr("x", width / 2)
          .attr("y", chartHeight + margin.bottom - 5)
          .style("text-anchor", "middle")
          .text("");

        if (yLabel === "Federal AGI" && federalTaxData) {
          const baseStandardDeduction = federalTaxData.standard_deduction || 0;
          const stdDedUnderPivot = baseStandardDeduction;
          const stdDedAtOrOverPivot = baseStandardDeduction + federalTaxData.standard_deduction_extra65;

          const minPlanAge = x.domain()[0];
          const maxPlanAge = x.domain()[x.domain().length - 1];

          const drawBracketLines = (brackets: TaxBracketTuple[], strokeColor: string, strokeDasharray: string) => {
            brackets.forEach((bracket) => {
              const bracketStartIncome = bracket[1];
              const thresholdUnderPivot = bracketStartIncome + stdDedUnderPivot;
              const thresholdAtOrOverPivot = bracketStartIncome + stdDedAtOrOverPivot;

              const yValueUnderPivot = y(thresholdUnderPivot);
              const yValueAtOrOverPivot = y(thresholdAtOrOverPivot);

              const xAtPivot = x("65") ?? 0;

              if (+maxPlanAge < 65) {
                if (thresholdUnderPivot < y.domain()[1] && thresholdUnderPivot > y.domain()[0]) {
                  svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yValueUnderPivot)
                    .attr("y2", yValueUnderPivot)
                    .attr("stroke", strokeColor)
                    .attr("stroke-dasharray", strokeDasharray)
                    .attr("stroke-width", 1);
                }
              } else if (+minPlanAge >= 65) {
                if (thresholdAtOrOverPivot < y.domain()[1] && thresholdAtOrOverPivot > y.domain()[0]) {
                  svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yValueAtOrOverPivot)
                    .attr("y2", yValueAtOrOverPivot)
                    .attr("stroke", strokeColor)
                    .attr("stroke-dasharray", strokeDasharray)
                    .attr("stroke-width", 1);
                }
              } else {
                if (thresholdUnderPivot < y.domain()[1] && thresholdUnderPivot > y.domain()[0]) {
                  svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", xAtPivot)
                    .attr("y1", yValueUnderPivot)
                    .attr("y2", yValueUnderPivot)
                    .attr("stroke", strokeColor)
                    .attr("stroke-dasharray", strokeDasharray)
                    .attr("stroke-width", 1);
                }
                if (thresholdAtOrOverPivot < y.domain()[1] && thresholdAtOrOverPivot > y.domain()[0]) {
                  svg.append("line")
                    .attr("x1", xAtPivot)
                    .attr("x2", width)
                    .attr("y1", yValueAtOrOverPivot)
                    .attr("y2", yValueAtOrOverPivot)
                    .attr("stroke", strokeColor)
                    .attr("stroke-dasharray", strokeDasharray)
                    .attr("stroke-width", 1);
                }
              }
            });
          };

          const cgTaxBrackets = federalTaxData.cg_taxtable || [];
          if (cgTaxBrackets.length > 0) {
            drawBracketLines(cgTaxBrackets, "darkgray", "2 6");
          }

          const taxBrackets = federalTaxData.taxtable || [];
          if (taxBrackets.length > 0) {
            drawBracketLines(taxBrackets, "gray", "0 2 6 0");
          }

          const irmaaBrackets = federalTaxData.irmaa_brackets || federalTaxData.irmaa_taxtable || federalTaxData.irmaa || federalTaxData.irmaa_table || [];
          if (irmaaBrackets.length > 0) {
            irmaaBrackets.forEach((bracket: any) => {
              const threshold = Array.isArray(bracket) ? bracket[0] : (bracket.Threshold ?? bracket.threshold ?? 0);
              if (threshold > 0 && threshold < y.domain()[1] && threshold > y.domain()[0]) {
                svg.append("line")
                  .attr("x1", 0)
                  .attr("x2", width)
                  .attr("y1", y(threshold))
                  .attr("y2", y(threshold))
                  .attr("stroke", "gray")
                  .attr("stroke-dasharray", "2 4")
                  .attr("stroke-width", 1);
              }
            });
          }
        } else if (yLabel === "State AGI") {
          const taxBrackets = stateTaxData?.taxtable || [];
          const standardDeduction = stateTaxData?.standard_deduction || 0;

          taxBrackets.forEach((bracket) => {
            const threshold = bracket[1] + standardDeduction;
            if (threshold < y.domain()[1]) {
              svg.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y(threshold))
                .attr("y2", y(threshold))
                .attr("stroke", "gray")
                .attr("stroke-dasharray", "2 4")
                .attr("stroke-width", 1);
            }
          });
        }

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(yLabel);
      };

      // Withdrawals and Conversions Line Chart
      createLineChart(
        withdrawalsLineChartRef,
        "Withdrawals & Conversions",
        ["Brokerage_Withdraw", "IRA_Withdraw", "Roth_Withdraw", "IRA_to_Roth"],
        [COLORS[0], COLORS[1], COLORS[2], COLORS_OTHER[5]]
      );

      // Income Sources Chart
      const incomeSourcesYMax = d3.max(data, d => d.Brokerage_Withdraw + d.IRA_Withdraw + d.Roth_Withdraw + d.Social_Security + d.CGD_Spendable + d.Cash_Withdraw) || 0;
      createStackedBarChart(
        incomeChartRef,
        incomeSourcesYMax,
        "Income Sources",
        ["Brokerage_Withdraw", "IRA_Withdraw", "Roth_Withdraw", "Social_Security", "CGD_Spendable", "Cash_Withdraw"],
        COLORS
      );

      // Spending Categories Chart
      const spendingCategoriesYMax = d3.max(data, d => (d.Fed_Tax || 0) + (d.State_Tax || 0) + (d.ACA_HC_Payment || 0) + (d.Medicare_Base || 0) + (d.Medicare_IRMAA || 0)) || 0;
      createStackedBarChart(
        spendingChartRef,
        spendingCategoriesYMax,
        "Mandatory Spending",
        ["Fed_Tax", "State_Tax", "ACA_HC_Payment", "Medicare_Base", "Medicare_IRMAA"],
        COLORS_SPENDING,
        d3.formatPrefix(".1", 1e3)
      );

      // Account Balances Chart
      const accountBalanceYMax = d3.max(data, d => d.Brokerage_Balance + d.IRA_Balance + d.Roth_Balance) || 0;
      createStackedBarChart(
        chartRef,
        accountBalanceYMax,
        "Account Balances",
        ["Brokerage_Balance", "IRA_Balance", "Roth_Balance"],
        COLORS,
        formatYAxis
      );

      // Income Type Chart (Ordinary vs Capital Gains)
      const incomeTypeYMax = d3.max(data, d => d.Ordinary_Income + d.Total_Capital_Gains) || 0;
      createStackedBarChart(
        incomeTypeChartRef,
        incomeTypeYMax,
        "Federal AGI",
        ["Ordinary_Income", "Total_Capital_Gains"],
        COLORS_OTHER,
        formatYAxis
      );

      // State AGI Chart
      const stateAgiAndCgYMax = d3.max(data, d => d.State_AGI) || 0;
      createStackedBarChart(
        stateAgiAndCgChartRef,
        stateAgiAndCgYMax,
        "State AGI",
        ["State_AGI"],
        COLORS_OTHER,
        formatYAxis
      );

      // Automatic Income Chart
      const automaticIncomeYMax = d3.max(data, d => (d.IRA_RMD + d.Social_Security + d.CGD_Spendable + d.Cash_Withdraw)) || 0;
      createStackedBarChart(
        automaticIncomeChartRef,
        automaticIncomeYMax,
        "Automatic Income",
        ["IRA_RMD", "Social_Security", "CGD_Spendable", "Cash_Withdraw"],
        [COLORS[1], COLORS[3], COLORS[4], COLORS[5]]
      );

      // Available Spending Chart
      const gsYMax = d3.max(data, d => (d.Available_Spending)) || 0;
      createStackedBarChart(
        generalSpendingConstantDollarsChartRef,
        gsYMax,
        "",
        ["Available_Spending"],
        ['#004040'],
        formatYAxis,
        300
      );
    }
  }, [drawdownPlan, federalTaxData, stateTaxData]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
      {isFormEdited && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded fixed z-50 w-full left-0 top-0 text-center">
          <strong>Warning:</strong> The results no longer match the current form inputs. Please recalculate to update the results.
        </div>
      )}

      {/* Plan Summary */}
      <Card className="mb-4 border-2 border-primary">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-grow text-center">
            <CardTitle>Plan Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center text-lg">
          {currentObjectiveType === 'max_spend' && spendingFloor !== undefined && (
            <div className="flex items-center justify-center">
              <p className="mr-4">Projected Available Spending: <span className="font-semibold">{formatCurrency(spendingFloor)}</span></p>
              <Button onClick={() => downloadCsv(drawdownPlan)} size="sm">Download CSV</Button>
            </div>
          )}
          {(currentObjectiveType === 'max_assets' || currentObjectiveType === 'min_taxes') && endOfPlanAssets !== undefined && (
            <div className="flex items-center justify-center">
              <p className="mr-4">Projected End-of-Plan Assets: <span className="font-semibold">{formatCurrency(endOfPlanAssets)}</span></p>
              <Button onClick={() => downloadCsv(drawdownPlan)} size="sm">Download CSV</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Spending Card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Available Spending & Constant Dollars</CardTitle>
          <CardDescription>About these numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="float-right ml-4 mb-2 w-1/3">
            <div ref={generalSpendingConstantDollarsChartRef} className="flex justify-center"></div>
          </div>
          <div className="text-left">
            <p className="mb-3">
              All of the values on this page are displayed in constant dollars.
            </p>
            <p className="mb-3">
              Constant dollars, also called real dollars, can be thought of as a measure of purchasing power. That means that when comparing values across time, the larger value of constant dollars can be used to buy more stuff.
            </p>
            <p className="mb-3">
              Here's a quick illustration involving one of the most boring charts possible. This is a chart of your Available Spending in constant dollars. Your Available Spending is how much you have left to spend after paying taxes and ACA premiums. DrawdownCalc schedules your withdrawals so that you have the same amount of purchasing power every year even after inflation. In constant dollar charts the values that keep up with inflation look the same year after year, because the purchasing power has not changed. Since your Available Spending keeps up inflation it looks the same year after year in terms of constant dollars.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Plan Table & Line Chart */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Drawdown Plan</CardTitle>
          <CardDescription>A drawdown plan based on your form.</CardDescription>
        </CardHeader>
        <CardContent>
          {cardMilestoneMessages.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
              <p className="font-semibold mb-1">Important Milestones This Year:</p>
              <ul className="list-disc list-inside pl-2">
                {cardMilestoneMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-center align-middle">Age</TableHead>
                <TableHead className="w-32 text-center align-middle">
                  <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[0] }}></span>
                  From Brokerage
                </TableHead>
                <TableHead className="w-32 text-center align-middle">
                  <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[1] }}></span>
                  From IRA
                </TableHead>
                <TableHead className="w-32 text-center align-middle">
                  <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[2] }}></span>
                  From Roth
                </TableHead>
                <TableHead className="w-32 text-center align-middle">
                  <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS_OTHER[5] }}></span>
                  Roth Conversion
                </TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="overflow-auto max-h-64">
            <Table>
              <TableBody>
                {drawdownPlan.map((year) => (
                  <TableRow key={year.age}>
                    <TableCell className="w-24 text-center">{year.age}</TableCell>
                    <TableCell className="w-32 text-center">{formatCurrency(year.Brokerage_Withdraw)}</TableCell>
                    <TableCell className="w-32 text-center">{formatCurrency(year.IRA_Withdraw)}</TableCell>
                    <TableCell className="w-32 text-center">{formatCurrency(year.Roth_Withdraw)}</TableCell>
                    <TableCell className="w-32 text-center">{formatCurrency(year.IRA_to_Roth)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-8 flex justify-center" ref={withdrawalsLineChartRef}></div>
        </CardContent>
      </Card>

      {/* Account Balances */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Account Balances</CardTitle>
          <CardDescription>Beginning of the year balances for each account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-8 flex justify-center" ref={chartRef}></div>
        </CardContent>
      </Card>

      {/* Income Sources */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>Where your money comes from.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-8 flex justify-center" ref={incomeChartRef}></div>
        </CardContent>
      </Card>

      {/* Mandatory Spending */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Mandatory Spending</CardTitle>
          <CardDescription>Costs that are generally unavoidable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-8 flex justify-center" ref={spendingChartRef}></div>
        </CardContent>
      </Card>

      {/* Automatic Income */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Automatic Income</CardTitle>
          <CardDescription>Income that arrives based on age or prior decisions, rather than immediate need or active effort.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-8 flex justify-center" ref={automaticIncomeChartRef}></div>
        </CardContent>
      </Card>

      {/* Taxes */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Taxes</CardTitle>
          <CardDescription>A closer look at taxes.</CardDescription>
        </CardHeader>
        <CardContent>
          {federalTaxData && (() => {
            const irmaaBrackets = federalTaxData.irmaa_taxtable || federalTaxData.irmaa_brackets || federalTaxData.irmaa || federalTaxData.irmaa_table;
            return (
              <div className="mt-6 text-sm border-t pt-4">
                <h4 className="font-semibold text-md mb-2 text-center">Federal Tax Details ({federalTaxData.status})</h4>
                <div className={`grid grid-cols-1 md:grid-cols-2 ${irmaaBrackets && irmaaBrackets.length > 0 ? 'lg:grid-cols-3' : ''} gap-x-8 gap-y-4`}>
                  <div className={`md:col-span-2 ${irmaaBrackets && irmaaBrackets.length > 0 ? 'lg:col-span-3' : ''}`}>
                    <p><strong>Standard Deduction:</strong> {formatCurrency(federalTaxData.standard_deduction)}</p>
                    <p><strong>Standard Deduction Extra (65+):</strong> {formatCurrency(federalTaxData.standard_deduction_extra65)}</p>
                    <p><strong>Net Investment Income Tax Threshold (AGI):</strong> {formatCurrency(federalTaxData.nii)}</p>
                  </div>

                  <div className="md:col-span-1">
                    <h5 className="font-medium mb-1">Ordinary Income Brackets:</h5>
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 px-2">Rate</TableHead>
                          <TableHead className="h-8 px-2 text-right">From</TableHead>
                          <TableHead className="h-8 px-2 text-right">To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {federalTaxData.taxtable.map((bracket, index) => (
                          <TableRow key={`ord-${index}`}>
                            <TableCell className="py-1 px-2">{(bracket[0] * 100).toFixed(1)}%</TableCell>
                            <TableCell className="py-1 px-2 text-right">{formatCurrency(bracket[1])}</TableCell>
                            <TableCell className="py-1 px-2 text-right">{bracket[2] >= 100000000 ? 'And above' : formatCurrency(bracket[2])}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:col-span-1">
                    <h5 className="font-medium mb-1">Capital Gains Brackets:</h5>
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 px-2">Rate</TableHead>
                          <TableHead className="h-8 px-2 text-right">From</TableHead>
                          <TableHead className="h-8 px-2 text-right">To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {federalTaxData.cg_taxtable.map((bracket, index) => (
                          <TableRow key={`cg-${index}`}>
                            <TableCell className="py-1 px-2">{(bracket[0] * 100).toFixed(1)}%</TableCell>
                            <TableCell className="py-1 px-2 text-right">{formatCurrency(bracket[1])}</TableCell>
                            <TableCell className="py-1 px-2 text-right">{bracket[2] >= 100000000 ? 'And above' : formatCurrency(bracket[2])}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {irmaaBrackets && irmaaBrackets.length > 0 && (
                    <div className="md:col-span-1">
                      <h5 className="font-medium mb-1">IRMAA Brackets:</h5>
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 px-2">Threshold</TableHead>
                            <TableHead className="h-8 px-2 text-right">Part B Surcharge</TableHead>
                            <TableHead className="h-8 px-2 text-right">Part D Surcharge</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {irmaaBrackets.map((bracket: any, index: number) => {
                            const threshold = Array.isArray(bracket) ? bracket[0] : (bracket.Threshold ?? bracket.threshold ?? 0);
                            const partB = Array.isArray(bracket) ? bracket[1] : (bracket.Part_B_Surcharge ?? bracket.part_b_surcharge ?? 0);
                            const partD = Array.isArray(bracket) ? bracket[2] : (bracket.Part_D_Surcharge ?? bracket.part_d_surcharge ?? 0);
                            return (
                              <TableRow key={`irmaa-${index}`}>
                                <TableCell className="py-1 px-2">{formatCurrency(threshold)}</TableCell>
                                <TableCell className="py-1 px-2 text-right">{formatCurrency(partB)}</TableCell>
                                <TableCell className="py-1 px-2 text-right">{formatCurrency(partD)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <div className="mt-8 flex justify-center" ref={incomeTypeChartRef}></div>
          {stateTaxData && (
            <div className="mt-6 text-sm border-t pt-4">
              <h4 className="font-semibold text-md mb-2 text-center">State Tax Details ({stateTaxData.status.replace('_', ' ')})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p><strong>Standard Deduction:</strong> {formatCurrency(stateTaxData.standard_deduction)}</p>
                  <p><strong>Taxes Retirement Income:</strong> {stateTaxData.taxes_retirement_income ? 'Yes' : 'No'}</p>
                  <p><strong>Taxes Social Security:</strong> {stateTaxData.taxes_ss ? 'Yes' : 'No'}</p>
                </div>

                <div className="md:col-span-2">
                  <h5 className="font-medium mb-1">Income Brackets:</h5>
                  {stateTaxData.taxtable && stateTaxData.taxtable.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 px-2">Rate</TableHead>
                          <TableHead className="h-8 px-2 text-right">From</TableHead>
                          <TableHead className="h-8 px-2 text-right">To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stateTaxData.taxtable.map((bracket, index) => (
                          <TableRow key={`state-ord-${index}`}>
                            <TableCell className="py-1 px-2">{(bracket[0] * 100).toFixed(2)}%</TableCell>
                            <TableCell className="py-1 px-2 text-right">{formatCurrency(bracket[1])}</TableCell>
                            <TableCell className="py-1 px-2 text-right">{bracket[2] >= 100000000 ? 'And above' : formatCurrency(bracket[2])}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>No state income tax or brackets defined.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="mt-8 flex justify-center" ref={stateAgiAndCgChartRef}></div>
        </CardContent>
      </Card>
    </div>
  );
}
