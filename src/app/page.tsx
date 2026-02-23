"use client";
import React from 'react'; // Import React for Fragment
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  useSidebar, // Import useSidebar
} from "@/components/ui/sidebar";
import { DisclaimerContent } from '@/components/disclaimer-content'; // Import the new component
import { DrawdownPlanForm } from "@/components/drawdown-plan-form";
import { calculateDrawdownPlan, DrawdownPlanInput, DrawdownPlanYear, DrawdownPlanResponse, FederalTaxData, TaxBracketTuple, StateTaxData } from "@/services/drawdown-plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Loader2 } from "lucide-react";
import { AlertTriangle, Info } from "lucide-react"; // Import Info icon
import * as d3 from "d3";


// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#800080'];
const COLORS_SPENDING = ['#4E8BAF', '#76C0C0', '#8FBC8F', '#A9A9A9', '#5F9EA0', '#696969'];
//const COLORS_SPENDING = ['#85BB65', '#A9A9A9', '#D3D3D3'];
const COLORS = ['#D98B5F', '#E0B550', '#8F8F4C', '#708090', '#B38CB4', '#9370DB'];
const COLORS_OTHER = ['#191970', '#006400', '#8B0000', '#483D8B', '#B8860B', '#595959'];

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

// Utility function to format numbers as currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
  }).format(value / 100);
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

// --- New AppContent Component ---
function AppContent() {
  const [drawdownPlan, setDrawdownPlan] = useState<DrawdownPlanYear[] | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [spendingFloor, setSpendingFloor] = useState<number | undefined>(undefined);
  const [endOfPlanAssets, setEndOfPlanAssets] = useState<number | undefined>(undefined);
  const [planStatus, setPlanStatus] = useState<string | undefined>(undefined);
  const [currentObjectiveType, setCurrentObjectiveType] = useState<string | undefined>(undefined); // State for objective type
  const [loading, setLoading] = useState(false);
  const [isFormEdited, setIsFormEdited] = useState(false);
  const [submittedSocialSecurityStartAge, setSubmittedSocialSecurityStartAge] = useState<number | null>(null);
  const [submittedBirthMonth, setSubmittedBirthMonth] = useState<number | null>(null);
  const [submittedCurrentAge, setSubmittedCurrentAge] = useState<number | null>(null);
  const [cardMilestoneMessages, setCardMilestoneMessages] = useState<string[]>([]);
  const [federalTaxData, setFederalTaxData] = useState<FederalTaxData | null>(null);
  const [stateTaxData, setStateTaxData] = useState<StateTaxData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error messages
  const withdrawChartRef = useRef(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<HTMLDivElement>(null);
  const spendingChartRef = useRef<HTMLDivElement>(null);
  const incomeTypeChartRef = useRef<HTMLDivElement>(null); // <-- Add ref for the new chart
  // const rothConversionChartRef = useRef<HTMLDivElement>(null); // <-- Ref for Roth Conversion chart
  const automaticIncomeChartRef = useRef<HTMLDivElement>(null); // Ref for the new automatic income chart
  const stateAgiAndCgChartRef = useRef<HTMLDivElement>(null); // Ref for the new State AGI & CG chart
  const generalSpendingConstantDollarsChartRef = useRef<HTMLDivElement>(null); // Ref for the available spending chart in "Available Spending & Constant Dollars" card
  const withdrawalsLineChartRef = useRef<HTMLDivElement>(null); // Ref for the new line chart
  const pageRef = useRef<HTMLDivElement>(null); // This ref will target the main results container div

  const { setOpen, toggleSidebar } = useSidebar(); // Call useSidebar here

  useEffect(() => {
    // Scroll to the top of the results when the plan is successfully submitted and displayed
    // or when an error occurs, or when loading starts (button pressed).
    if (pageRef.current && (loading || errorMessage || (submitted && drawdownPlan && !errorMessage))) {
        requestAnimationFrame(() => {
          pageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
  }, [submitted, drawdownPlan, errorMessage, loading]); // Added loading to dependencies

  useEffect(() => {
    if (drawdownPlan && chartRef.current && incomeChartRef.current
      && spendingChartRef.current && incomeTypeChartRef.current
      && automaticIncomeChartRef.current
      && stateAgiAndCgChartRef.current // Ensure this new ref is also current
      && generalSpendingConstantDollarsChartRef.current // Ensure this ref is also current
      && withdrawalsLineChartRef.current) { // Add new ref to condition
      // Clear previous charts
      d3.select(chartRef.current).select("svg").remove();
      d3.select(incomeChartRef.current).select("svg").remove();
      d3.select(spendingChartRef.current).select("svg").remove();
      d3.select(incomeTypeChartRef.current).select("svg").remove(); // <-- Clear the new chart too
      d3.select(generalSpendingConstantDollarsChartRef.current).select("svg").remove(); // Clear the new available spending chart
      // d3.select(rothConversionChartRef.current).select("svg").remove(); // <-- Clear Roth Conversion chart
      d3.select(automaticIncomeChartRef.current).select("svg").remove(); // <-- Clear)
      const data = drawdownPlan;
      const margin = { top: 40, right: 60, bottom: 60, left: 90 }; // { top: 20, right: 60, bottom: 30, left: 60 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      // --- Tooltip Setup ---
      // Select the tooltip div (we'll add this div in the JSX later)
      const tooltip = d3.select("#chart-tooltip");

      // Function to format keys for display
      const formatKey = (key: string) => {
        return key.replace(/_/g, ' '); // Replace underscores with spaces
      };

      // Function to create the line chart
      const createLineChart = (
        ref: React.RefObject<HTMLDivElement> | null,
        yLabel: string,
        dataKeys: (keyof DrawdownPlanYear)[], // Keys for the lines
        lineColors: string[] // Colors for the lines
      ) => {
        if (!data || data.length === 0 || !ref?.current) return; // Added !ref?.current check

        const yMax = d3.max(data, d => {
          let maxVal = 0;
          dataKeys.forEach(key => {
            const val = d[key] as number; // Type assertion
            if (val > maxVal) maxVal = val;
          });
          return maxVal;
        }) || 0;


        const svg = d3.select(ref.current) // Use ref.current directly
          .append("svg")
          .attr("width", '90%') // Height attribute removed to allow scaling with aspect ratio
          // .attr("height", height + margin.top + margin.bottom) 
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
          .call(d3.axisBottom(x).tickFormat(d3.format("d"))); // Format ticks as integers for age

        svg.append("g")
          .call(d3.axisLeft(y).tickFormat(formatYAxis));

        dataKeys.forEach((key, i) => {
          const line = d3.line<DrawdownPlanYear>()
            .x(d => x(d.age))
            .y(d => y(d[key] as number)); // Type assertion

          svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", lineColors[i % lineColors.length])
            .attr("stroke-width", 3) // Increased stroke-width for bolder lines
            .attr("d", line);

          // Add circles for tooltips
          svg.selectAll(`.dot-${key}`) // Use a class specific to the key
            .data(data)
            .enter().append("circle")
            .attr("class", `dot-${key}`)
            .attr("cx", d => x(d.age))
            .attr("cy", d => y(d[key] as number))
            .attr("r", 10) // Radius of the circle, adjust as needed
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


          // svg.append("path") // Re-add the line on top of circles if you want circles to be "under"
          //   .datum(data)
          //   .attr("fill", "none")
          //   .attr("stroke", lineColors[i % lineColors.length])
          //   .attr("stroke-width", 3)
          //   .attr("d", line);

          // Add circles for tooltips - these will be drawn on top of the lines
       });

        // Y-axis label
        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(yLabel);

        // X-axis label (Age) could be added similarly if desired
      };

       // Function to create the stacked bar chart
      const createStackedBarChart = (
        ref: React.RefObject<HTMLDivElement> | null, 
        yMax: number, 
        yLabel: string, 
        dataKeys: string[], 
        colors: string[], 
        yFormat = d3.formatPrefix(".1", 1e3),
        chartHeight = height, // Default to the global height
        customMargins?: { top: number; right: number; bottom: number; left: number } // Optional custom margins
      ) => {
        const margin = customMargins || { top: 40, right: 60, bottom: 60, left: 90 };
        if (!ref?.current) return;
        const svg = d3.select(ref.current)
          .append("svg")
          // .attr("preserveAspectRatio", "none")
          .attr("width", '90%') // Height attribute removed
          // .attr("height", chartHeight + margin.top + margin.bottom)
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

        // Map DrawdownPlanYear[] to { [key: string]: number }[]
        const stackableData = data.map(d =>
          dataKeys.reduce<{ [key: string]: number }>((acc, key) => {
            acc[key] = d[key as keyof DrawdownPlanYear] as number;
            // Optionally add other fields (like age) if needed for tooltips
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
          .attr("y", d => y(d[1])) // Use the top value of the segment
          .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
          .attr("width", x.bandwidth())
          .on("mouseover", function(event, d_segment) {  // d_segment is the data for this segment
            const segmentValue = d_segment[1] - d_segment[0]; // Use d_segment here
            // Find the key corresponding to this segment
            const seriesIndex = stackedData.findIndex(series => series.some(segment => segment === d_segment));
            const segmentKey = dataKeys[seriesIndex] || "Unknown";
            
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<strong>Age:</strong> ${d_segment.data.age}<br/><strong>${formatKey(segmentKey)}:</strong> ${formatCurrency(segmentValue)}`)
              .style("left", (event.pageX + 15) + "px") // Position tooltip near cursor
              .style("top", (event.pageY - 28) + "px");
           })
          .on("mouseout", function(d) {
            // console.log("Mouseout fired!"); // <-- Add console log
            tooltip.transition()
                   .duration(500)
                   .style("opacity", 0);
          });
        
        // Add invisible rects at the top of each bar for total tooltip
        data.forEach(d_item => {
          let total = 0;
          dataKeys.forEach(key => {
            total += d_item[key as keyof DrawdownPlanYear] as number;
          });

          svg.append("rect")
            .attr("x", x(d_item.age.toString()) || "0")
            .attr("y", y(total) - margin.top/2.0) // Start at the very top of the bar
            .attr("width", x.bandwidth())
            .attr("height", margin.top/2.0) // Make it as tall as the top margin, or a bit less
            .style("fill", "transparent") // Make it invisible "transparent"
            .on("mouseover", (event) => { // Renamed event to avoid conflict if d_item was named event
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
          .attr("x", width / 2) // Centered horizontally
          .attr("y", chartHeight + margin.bottom - 5) // Positioned below the x-axis
          .style("text-anchor", "middle")
          .text(""); // Remove the x-axis label

        // Add horizontal lines for tax bracket thresholds
        if (yLabel === "Federal AGI" && federalTaxData) {
          const baseStandardDeduction = federalTaxData.standard_deduction || 0;
          const filingStatus = federalTaxData.status;
          const agePivot = "65";

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

              const xAtPivot = x(agePivot);

              // console.log(bracketStartIncome, thresholdUnderPivot, thresholdAtOrOverPivot, minPlanAge, maxPlanAge, 0, width, xAtPivot); // Debug log, if needed

              if (+maxPlanAge < +agePivot) { // Entire plan is under pivot age
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
              } else if (+minPlanAge >= +agePivot) { // Entire plan is at or over pivot age
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
              } else { // Plan spans the pivot age
                // Segment before pivot age
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
                // Segment at or after pivot age
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
        } else if (yLabel === "State AGI") { // Add lines for the State AGI chart
          const taxBrackets = stateTaxData?.taxtable || [];
          const standardDeduction = stateTaxData?.standard_deduction || 0;

          taxBrackets.forEach((bracket, index) => {
            const threshold = bracket[1] + standardDeduction; // Start of bracket + standard deduction
            if (threshold < y.domain()[1]) { // Only draw if within chart's actual y-axis range
              svg.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y(threshold))
                .attr("y2", y(threshold))
                .attr("stroke", "gray") // Different color for state lines
                .attr("stroke-dasharray", "2 4") // Different dash pattern
                .attr("stroke-width", 1);
            }
          });

          // Note: State AGI chart currently doesn't show capital gains brackets separately
          // If it did, you'd add logic for state-specific CG brackets here.
        }

        svg.append("text") // Y-axis label
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(yLabel);

        // const legend = svg.append("g")
        //   .attr("class", "legend")
        //   .attr("transform", `translate(${width - 100}, -10)`);

      };

      // Withdrawals and Conversions Line Chart
      createLineChart(
        withdrawalsLineChartRef,
        "Withdrawals & Conversions",
        ["Brokerage_Withdraw", "IRA_Withdraw", "Roth_Withdraw", "IRA_to_Roth"],
        [COLORS[0], COLORS[1], COLORS[2], COLORS_OTHER[5]] // Example colors
      );

      // Income Sources Chart
      const incomeSourcesYMax = d3.max(data, d => d.Brokerage_Withdraw + d.IRA_Withdraw + d.Roth_Withdraw + d.Social_Security + d.CGD_Spendable + d.Cash_Withdraw) || 0;
      createStackedBarChart(
        incomeChartRef, // Pass ref object
        incomeSourcesYMax,
        "Income Sources",
        ["Brokerage_Withdraw", "IRA_Withdraw", "Roth_Withdraw", "Social_Security", "CGD_Spendable", "Cash_Withdraw"],
        COLORS
      );

      // Spending Categories Chart
      const spendingCategoriesYMax = d3.max(data, d => d.Fed_Tax + d.State_Tax + d.ACA_HC_Payment) || 0;
      createStackedBarChart(
        spendingChartRef, // Pass ref object
        spendingCategoriesYMax,
        "Mandatory Spending",
        ["Fed_Tax", "State_Tax", "ACA_HC_Payment"],
        COLORS_SPENDING,
        d3.formatPrefix(".1", 1e3)
      );

      // Account Balances Chart
      const accountBalanceYMax = d3.max(data, d => d.Brokerage_Balance + d.IRA_Balance + d.Roth_Balance) || 0;
      createStackedBarChart(
        chartRef, // Pass ref object
        accountBalanceYMax,
        "Account Balances",
        ["Brokerage_Balance", "IRA_Balance", "Roth_Balance"],
        COLORS,
        formatYAxis
      );

      // Income Type Chart (Ordinary vs Capital Gains)
      const incomeTypeYMax = d3.max(data, d => d.Ordinary_Income + d.Total_Capital_Gains) || 0;
      // const tinyChartHeight = 400; // Define a very small height
      createStackedBarChart(
        incomeTypeChartRef, // Pass ref object
        incomeTypeYMax,
        "Federal AGI",
        ["Ordinary_Income", "Total_Capital_Gains"], // <-- Keys for the new chart
        COLORS_OTHER, // <-- Example colors, adjust as needed
        formatYAxis, // Pass the y-axis formatter
        // tinyChartHeight // Pass the tiny height
      );

      // New Stacked Bar Chart for State AGI and Total Capital Gains
      const stateAgiAndCgYMax = d3.max(data, d => d.State_AGI) || 0;
      createStackedBarChart(
        stateAgiAndCgChartRef,
        stateAgiAndCgYMax,
        "State AGI",
        ["State_AGI"],
        // Using distinct colors, perhaps from a different palette or new ones
        COLORS_OTHER, // Example: using next available colors
        formatYAxis,
        // 300, // Default height
        // { top: 20, right: 60, bottom: 30, left: 70 } // Adjusted left margin for potentially longer y-axis labels
      );

      // Automatic Income Chart
      // Assuming RMDs are part of IRA_Withdraw for ages >= RMD age, and CGD_Spendable is separate.
      // If RMD is a separate field in DrawdownPlanYear, use that.
      // For now, let's assume 'IRA_Withdraw' for RMDs (this might need adjustment based on your data structure)
      // and 'Ordinary_Income' for other non-SS, non-CGD income.
      const automaticIncomeYMax = d3.max(data, d => (d.IRA_RMD + d.Social_Security + d.CGD_Spendable + d.Cash_Withdraw)) || 0;
      createStackedBarChart(
        automaticIncomeChartRef,
        automaticIncomeYMax,
        "Automatic Income",
        ["IRA_RMD", "Social_Security", "CGD_Spendable", "Cash_Withdraw"], // Adjust IRA_Withdraw if RMD is separate
        [COLORS[1], COLORS[3], COLORS[4], COLORS[5]] // Example colors
      );

      // Available Spending (Constant Dollars) Chart
      // This chart is intended for the "Available Spending & Constant Dollars" card to illustrate the concept.
      // It assumes 'Available_Spending' is a key in DrawdownPlanYear representing constant dollar spending,
      // which should appear as a flat line if inflation is correctly accounted for and spending is constant.
      const gsYMax = d3.max(data, d => (d.Available_Spending)) || 0;
      createStackedBarChart(
        generalSpendingConstantDollarsChartRef,
        gsYMax,
        "",
        ["Available_Spending"],
        ['#004040'], // Example colors
        formatYAxis,
        300,
        // { top: 0, right: 5, bottom: 0, left: 45 } // Custom smaller margins
      );

      // Roth Conversion Chart
      // const rothConversionYMax = d3.max(data, d => d.IRA_to_Roth) || 0;
      // createStackedBarChart(
      //   rothConversionChartRef, // Pass ref object
      //   rothConversionYMax,
      //   "Roth Conversions",
      //   ["IRA_to_Roth"], // Data key
      //   [COLORS_OTHER[5]] // Example color (purple)
      // );
    }
  }, [drawdownPlan]);

  const handleFormEdit = useCallback(() => setIsFormEdited(true), []);

  const handleSubmit = useCallback(async (input: DrawdownPlanInput) => {
    // console.log(input);
    setErrorMessage(null); // Clear any previous error messages
    const apiPayload = {
      arguments: {
        allow_conversions: input.roth_conversion_preference === "anytime",
        no_conversions: input.roth_conversion_preference === "never",
        no_conversions_after_socsec: input.roth_conversion_preference === "before_socsec",
        pessimistic_taxes: input.pessimistic.taxes,
        pessimistic_healthcare: input.pessimistic.healthcare,
        objective: {
          type: input.spending_preference,
          value: input.annual_spending,
        }
      },
      startage: input.about.age,
      birthmonth: Number(input.about.birth_month),
      endage: input.about.end_of_plan_age,
      inflation: input.predictions.inflation,
      returns: input.predictions.returns,
      taxes: {
        filing_status: input.about.filing_status,
        state: input.about.state_of_residence,
      },
      income: {
        social_security: {
          amount: input.social_security.amount * 12.0,
          age: input.social_security.starts === -1 ? `${input.about.age - 1}-` : `${input.social_security.starts}-`
        },
        cash: { amount: input.cash.amount, age: `${input.about.age}`, tax: false } // Assuming cash is for startAge and not taxable by default
      },
      aca: { 
        premium: input.ACA.premium, 
        slcsp: input.ACA.slcsp,
        covered: input.ACA.people_covered 
      },
      aftertax: {
        bal: input.brokerage.balance,
        basis: input.brokerage.basis,
        distributions: input.brokerage.distributions
      },
      IRA: { bal: input.IRA.balance },
      roth: {
        bal: input.Roth.balance, // Assuming input.Roth.balance is a number
        contributions: [
          // Older conversions (age at conversion would be current age - 5 or more)
          // We'll use current age - 5 as a representative age for "older"
          ...(input.Roth.old_conversions > 0 ? [[input.about.age - 5, input.Roth.old_conversions]] : []),
          // Recent conversions, mapping year offset to age at conversion
          ...(input.Roth.conversion_year_minus_4 > 0 ? [[input.about.age - 4, input.Roth.conversion_year_minus_4]] : []),
          ...(input.Roth.conversion_year_minus_3 > 0 ? [[input.about.age - 3, input.Roth.conversion_year_minus_3]] : []),
          ...(input.Roth.conversion_year_minus_2 > 0 ? [[input.about.age - 2, input.Roth.conversion_year_minus_2]] : []),
          ...(input.Roth.conversion_year_minus_1 > 0 ? [[input.about.age - 1, input.Roth.conversion_year_minus_1]] : []),
        ].sort((a, b) => a[0] - b[0]) // Sort by age at conversion, ascending
        // contributions: input.rothContributions.map(c => [parseInt(c.age), parseInt(c.amount)])
      }
    };

    // console.log("Submitting payload:", apiPayload); // For debugging
    setLoading(true);
    try {
      // The 'input' to calculateDrawdownPlan should now be the apiPayload
      const response: DrawdownPlanResponse = await calculateDrawdownPlan(apiPayload as any); // Using 'as any' for now, ideally update DrawdownPlanInput type
      // console.log(response);
      setDrawdownPlan(response.planYears);
      setSubmitted(true);
      setSpendingFloor(response.spendingFloor);
      setEndOfPlanAssets(response.endOfPlanAssets);
      setPlanStatus(response.status);
      setCurrentObjectiveType(apiPayload.arguments.objective.type); // Store the objective type
      setFederalTaxData(response.federal || null); // Store federal tax data
      setStateTaxData(response.state || null); // Store state tax data
      setSubmittedSocialSecurityStartAge(input.social_security.starts); // Store SS start age
      const birthMonth = Number(input.about.birth_month);
      const currentAge = input.about.age;
      setSubmittedBirthMonth(birthMonth); // Store birth month
      setSubmittedCurrentAge(currentAge); // Store current age
      setIsFormEdited(false); // Reset isFormEdited to false on successful submission

      // Calculate card milestone messages
      const messages: string[] = [];
      if (birthMonth) {
        if (birthMonth <= 6 && currentAge === 59) {
          messages.push("This is the year you turn 59.5.  DrawdownCalc assumes that you time your withdrawals to avoid withdrawal penalties.");
        } else if (birthMonth > 6 && currentAge === 60) {
          messages.push("This is the year you turn 59.5.  DrawdownCalc assumes that you time your withdrawals to avoid withdrawal penalties.");
        }
      }
      if (input.social_security.starts && currentAge === input.social_security.starts && input.social_security.starts !== -1) {
        messages.push("This is the year your Social Security payments begin.  DrawdownCalc assumes that they begin in your birth month.");
      }
      if (currentAge === 65) {
        messages.push("This is the year you become eligible for Medicare.  DrawdownCalc assumes that your last ACA payment occurs the month before your birth month.");
      }
      setCardMilestoneMessages(messages);

    } catch (error) {
      setCardMilestoneMessages([]); // Clear messages on error
      setFederalTaxData(null); // Clear federal tax data on error
      setStateTaxData(null); // Clear state tax data on error
      console.error("Failed to calculate drawdown plan:", error); // This is line 544
      let displayError = "An error occurred while calculating the drawdown plan. Please check your inputs or try again later.";
      if (error instanceof Error && error.message) {
        // You could potentially parse error.message if it contains user-friendly info
        // For now, we'll stick to a generic message or append for debugging:
        // displayError += ` (Details: ${error.message})`;
      }
      setErrorMessage(displayError);
      setDrawdownPlan(null); // Ensure no old plan is shown
      setSubmitted(true); // To move to the results/error display area
    } finally {
      setLoading(false);
    }
  }, []);
  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
    // setShowFieldDescriptions(true); // Show field descriptions
    setOpen(true); // Use setOpen from the hook
  };

  return (
    <> {/* Use Fragment to return multiple elements */}
      {/* --- Tooltip Div --- */}
      <div id="chart-tooltip" style={{
        position: 'absolute', opacity: 0, pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', padding: '5px', borderRadius: '3px',
        fontSize: '12px', whiteSpace: 'nowrap',
        zIndex: 9999 // Add a high z-index
      }}></div>
      <Sidebar collapsible="icon" className="pt-[2.875rem] pb-[5.125rem]"> {/* defaultOpen controls initial state */}
        <div className="px-2 pb-2 pt-2"> {/* Adjusted top padding for page header */}
            {(
              <SidebarTrigger />  
            )}
        </div>
        <div className={cn("pt-0 px-4 overflow-y-auto", {
             "pointer-events-none opacity-50": !hasAcceptedTerms,
            "group-data-[state=collapsed]:overflow-y-hidden": true,
        })}>
            <SidebarContent>
            <DrawdownPlanForm
              onSubmit={handleSubmit}
              onFormEdit={handleFormEdit} // Pass the callback
            />
          </SidebarContent>
        </div>
        <SidebarFooter className=""> {/* Adjusted bottom padding for new page footer height */}
          <SidebarSeparator />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset ref={pageRef} className="scroll-mt-[2.875rem] scroll-mb-[5.125rem] min-h-0">
        {!hasAcceptedTerms ? (
          <div className="h-[calc(100vh-2.875rem-5.125rem)] flex flex-col gap-4 p-4 initial-view-background bg-white/100 bg-blend-overlay"> {/* Ensure it's a flex container that grows */}
            <Card className="border-2 border-primary md:w-full min-h-0 flex flex-1 flex-col "> {/* Removed h-full, flex-1 is sufficient */}
              <CardContent className="p-1 flex-1 flex flex-col justify-center items-center">
                <div className="flex flex-col justify-center items-center flex-1 text-black bg-[url('/calculator.svg')] bg-cover bg-center bg-no-repeat bg-white/95 bg-blend-overlay w-full">
                  <p className="mb-6 font-bold text-primary text-5xl pb-12 text-center">
                    Welcome to DrawdownCalc
                  </p>
                  <p className="mb-3 text-2xl pb-8 text-center">
                    For retirees wondering how to approach withdrawing money from their retirement accounts
                  </p>
                  <p className="mb-3 text-xl pb-4 text-center">
                    DrawdownCalc attempts to answer common questions about retirement finances
                  </p>
                  <ul className="mb-3 text-xl list-none list-inside text-center max-w-md"> {/* Changed to ul and added styling */}
                    <li>What is the most I could spend every year?</li>
                    <li>Should I do Roth conversions?</li>
                    <li>Which account do I withdraw from first?</li>
                    <li>Could I minimize RMDs?</li>
                    <li>How can I maximize what I leave behind?</li>
                  </ul>
                  <Button className="mt-8" onClick={handleAcceptTerms}>Get Started</Button>
                  </div>
                </CardContent>
            </Card>
          </div>
        ) : loading ? (
            <div className="h-[calc(100vh-2.875rem-5.125rem)] relative flex flex-col p-4 initial-view-background bg-white/100 bg-blend-overlay"> {/* Added relative positioning */}
            <div className="grid grid-cols-4 grid-rows-4 gap-4 flex-1">
              {Array.from({ length: 16 }).map((_, index) => {
                const rowIndex = Math.floor(index / 4);
                const colIndex = index % 4;
                const isPrimaryBg = (rowIndex + colIndex) % 2 === 0;
                return (
                  <Card
                    key={index}
                    className={cn(
                      "border-2 border-primary flex-1", // flex-1 to fill cell
                      isPrimaryBg ? "bg-primary" : "bg-[url('/calculator.svg')] bg-white/75 bg-blend-overlay bg-cover bg-center bg-no-repeat"
                    )}
                  >
                    <CardContent className="h-full w-full" /> {/* Ensures card has dimensions */}
                  </Card>
                );
              })}
            </div>
            {/* Spinner and text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Loader2 className="h-20 w-20 animate-spin text-[#00c0c0]" /> {/* Increased size and added color */}
                <span className="mt-4 text-2xl font-bold text-primary bg-white/90 bg-blend-overlay">Calculating Drawdown Plan...</span> {/* Added color */}
            </div>
          </div>
        ) : (
          // Content to display when not loading and terms accepted
          <>
            {errorMessage && (
              <div className="p-4 m-4 bg-red-100 text-red-700 rounded text-center border border-red-300">
                <strong>Error:</strong> {errorMessage}
                <Button onClick={() => setErrorMessage(null)} size="sm" variant="destructive" className="ml-4 mt-2 sm:mt-0">
                  Dismiss
                </Button>
              </div>
            )}

            {/* Regular content, shown if no error message is currently active */}
            {!errorMessage && (
              !submitted ? (
                    <div className="flex flex-col gap-4 px-4 pb-4 pt-4 md:grid md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                 {/* Flex container for the two cards */}
                  <div className="flex flex-col md:flex-row md:flex-1 gap-4">
                        <Card className="border-2 border-primary md:w-1/2 md:h-full flex flex-col bg-[url('/calculator.svg')] bg-cover bg-center bg-no-repeat bg-white/85 bg-blend-overlay">
                          <CardContent className="flex flex-col justify-center items-center flex-grow">
                            <div className="text-center text-[#008080]"> {/* Removed h-full as parent now handles centering */}
                              <p className="mb-6 font-bold text-4xl">
                                Accounts
                              </p><p></p>
                              <p className="mb-3 text-2xl">
                                Brokerage
                              </p>
                              <p className="mb-3 text-2xl">
                                IRA
                              </p>
                              <p className="mb-3 text-2xl">
                                Roth
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                    <Card className="border-2 border-primary md:w-1/2 md:h-full flex flex-col">
                      <CardHeader>
                        <CardTitle>Accounts</CardTitle>
                        <CardDescription></CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="text-left">
                          <p className="mb-3">
                            DrawdownCalc focuses on the three different types of accounts that many retirees have.
                          </p>
                          <p className="mb-3">
                            The first is your taxable investments account. Earnings from this account will be taxed according to the capital gains tax rates. DrawdownCalc refers to this account as your <b>Brokerage</b> account.
                          </p>
                          <p className="mb-3">
                            Another type of account is your retirement account where the money has not yet been taxed, but will be taxed when withdrawn. This can be a traditional 401k, traditional IRA, SEP, etc. DrawdownCalc uses the term <b>IRA</b> to refer to all of these.
                          </p>
                          <p className="mb-3">
                            The last type of account is your retirement account where taxes have already been paid and withdrawals will be tax free. DrawdownCalc refers to these accounts as your <b>Roth</b> account.
                          </p>
                          <p className="mb-3">
                            DrawdownCalc needs information about all of these accounts and more to calculate a drawdown plan.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                      <div className="flex flex-col md:flex-row md:flex-1 gap-4">
                       <Card className="border-2 border-primary md:w-1/2 md:h-full flex flex-col">
                          <CardHeader>
                            <CardTitle>Form</CardTitle>
                            <CardDescription></CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <div className="text-left">
                              <p className="mb-3">
                                The form on the left has many fields, but they are all necessary to calculate a drawdown plan.
                              </p>
                              <p className="mb-3">
                                Most of the fields should be self-explanatory.  Hover over the <b>information</b> icons <Info size={16} className="text-blue-600 inline-block" /> for additional information about selected fields.
                              </p>
                              <p className="mb-3">
                                For fields that may not be used in a straight-forward way, hovering over the <b>alert</b> icon <AlertTriangle size={16} className="text-yellow-700 inline-block"/> will give you more information.  For even more information about these fields click on the Fundamentals link at the top of the page.
                              </p>
                              <p className="mb-3">
                                DrawdownCalc can produce plans with one of two <b>goals</b> in mind.  It can work to produce a plan that maximizes your spending (not counting taxes and ACA premiums) in the first year of retirement such that the plan can continue to produce that same amount of available spending (taking inflation into account) for every year of retirement. Or if you choose, it can work to produce a plan to maximize your end-of-plan assets based on a set spending level.
                              </p>
                              <p className="mb-3">
                                Once you have filled out the form select <b>Calculate Drawdown Plan</b> and a plan will be calculated for you.  Be prepared to be patient as the creation of a plan can take anywhere from 30 seconds to 5 minutes.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-primary md:w-1/2 bg-primary md:h-full flex flex-col">
                          <CardContent className="flex flex-col justify-center items-center flex-grow">
                            <div className="text-center text-white"> {/* Removed h-full as parent now handles centering */}
                              <p className="mb-6 font-bold text-4xl">
                                Form
                              </p><p></p>
                              <p className="mb-3 text-2xl">
                                Information
                              </p>
                              <p className="mb-3 text-2xl">
                                Alerts
                              </p>
                              <p className="mb-3 text-2xl">
                                Goals
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                </div>
              ) : drawdownPlan ? (
                <div className="flex flex-col gap-4 px-4 pb-4 pt-4"> {/* Changed p-4 to px-4 pb-4 pt-6 */}
              {drawdownPlan && isFormEdited && (
                      <div className="p-4 bg-yellow-100 text-yellow-800 rounded fixed z-50 w-full left-0 top-0 text-center">
                  <strong>Warning:</strong> The results no longer match the current form inputs. Please recalculate to update the results.
                </div>
              )}
                    {/* Display Spending Floor or End of Plan Assets */}
                    <Card className="mb-4 border-2 border-primary"> {/* Added ref to the Plan Summary Card */}
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex-grow text-center"><CardTitle>Plan Summary</CardTitle></div>
                        {/* Button is now part of the conditional rendering below */}
                      </CardHeader>
                      <CardContent className="text-center text-lg">
                        {/* planStatus <p className="mb-2">Solver Status: <span className="font-semibold">{planStatus}</span></p> */}
                  {currentObjectiveType === 'max_spend' && spendingFloor !== undefined && (
                          <div className="flex items-center justify-center"> {/* Flex container for text and button */}
                            <p className="mr-4">Projected Available Spending: <span className="font-semibold">{formatCurrency(spendingFloor)}</span></p>
                            <Button onClick={() => downloadCsv(drawdownPlan)} size="sm">Download CSV</Button>
                          </div>
                        )}
                  {(currentObjectiveType === 'max_assets' || currentObjectiveType === 'min_taxes') && endOfPlanAssets !== undefined && (
                          <div className="flex items-center justify-center"> {/* Flex container for text and button */}
                            <p className="mr-4">Projected End-of-Plan Assets: <span className="font-semibold">{formatCurrency(endOfPlanAssets)}</span></p>
                            <Button onClick={() => downloadCsv(drawdownPlan)} size="sm">Download CSV</Button>
                          </div>
                        )}
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Available Spending & Constant Dollars</CardTitle>
                        <CardDescription>About these numbers.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Container for the chart, floated to the upper right */}
                        <div className="float-right ml-4 mb-2 w-1/3"> {/* Adjust width (e.g., w-1/3) and margins as needed */}
                          <div ref={generalSpendingConstantDollarsChartRef} className="flex justify-center"></div>
                        </div>
                        {/* Text content will flow around the floated chart */}
                        <div className="text-left">
                          <p className="mb-3">
                            All of the values on this page are displayed in constant dollars.
                          </p>
                          <p className="mb-3">
                            Constant dollars, also called real dollars, can be thought of as a measure of purchasing power.  That means that when comparing values across time, the larger value of constant dollars can be used to buy more stuff.
                          </p>
                          <p className="mb-3"> {/* Text will wrap around the floated chart */}
                            Here's a quick illustration involving one of the most boring charts possible.  This is a chart of your Available Spending in constant dollars.  Your Available Spending is how much you have left to spend after paying taxes and ACA premiums.  DrawdownCalc schedules your withdrawals so that you have the same amount of purchasing power every year even after inflation.  In constant dollar charts the values that keep up with inflation look the same year after year, because the purchasing power has not changed.  Since your Available Spending keeps up inflation it looks the same year after year in terms of constant dollars.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
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
                          {/* Age column - no color swatch */}
                          <TableHead className="w-24 text-center align-middle">Age</TableHead>
                          {/* Brokerage Withdraw column with color swatch */}
                          <TableHead className="w-32 text-center align-middle">
                            <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[0] }}></span>
                            From Brokerage
                          </TableHead>
                          {/* IRA Withdraw column with color swatch */}
                          <TableHead className="w-32 text-center align-middle">
                            <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[1] }}></span>
                            From IRA
                          </TableHead>
                          {/* Roth Withdraw column with color swatch */}
                          <TableHead className="w-32 text-center align-middle">
                            <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS[2] }}></span>
                            From Roth
                          </TableHead>
                          {/* Roth Conversion column with color swatch */}
                          <TableHead className="w-32 text-center align-middle">
                            <span className="inline-block w-3 h-3 mr-1 rounded-sm align-middle" style={{ backgroundColor: COLORS_OTHER[5] }}></span>
                            Roth Conversion
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                    <div className="overflow-auto max-h-64">
                      <Table>
                        <TableBody>{drawdownPlan.map((year) => {
                            const rowContent = (
                              <>
                                <TableCell className="w-24 text-center">{year.age}</TableCell>
                                <TableCell className="w-32 text-center">{formatCurrency(year.Brokerage_Withdraw)}</TableCell>
                                <TableCell className="w-32 text-center">{formatCurrency(year.IRA_Withdraw)}</TableCell>
                                <TableCell className="w-32 text-center">{formatCurrency(year.Roth_Withdraw)}</TableCell>
                                <TableCell className="w-32 text-center">{formatCurrency(year.IRA_to_Roth)}</TableCell>
                              </>
                            );
                            return <TableRow key={year.age}>{rowContent}</TableRow>;
                          })}</TableBody>
                      </Table>
                    </div> {/* Add container for the new line chart */}
                          <div className="mt-8 flex justify-center" ref={withdrawalsLineChartRef}></div>
                  </CardContent>
              </Card>
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Account Balances</CardTitle>
                        <CardDescription>Beginning of the year balances for each account.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-8 flex justify-center" ref={chartRef}></div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Income Sources</CardTitle>
                        <CardDescription>Where your money comes from.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-8 flex justify-center" ref={incomeChartRef}></div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Mandatory Spending</CardTitle>
                        <CardDescription>Costs that are generally unavoidable.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-8 flex justify-center" ref={spendingChartRef}></div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Automatic Income</CardTitle>
                        <CardDescription>Income that arrives based on age or prior decisions, rather than immediate need or active effort.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-8 flex justify-center" ref={automaticIncomeChartRef}></div> {/* Add container for the new chart */}
                      </CardContent>
                    </Card>
                    {/* In the JSX part of page.tsx */}
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle>Taxes</CardTitle>
                        <CardDescription>A closer look at taxes.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {federalTaxData && (
                              <div className="mt-6 text-sm border-t pt-4">
                            <h4 className="font-semibold text-md mb-2 text-center">Federal Tax Details ({federalTaxData.status})</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                              <div>
                                <p><strong>Standard Deduction:</strong> {formatCurrency(federalTaxData.standard_deduction)}</p>
                                <p><strong>Standard Deduction Extra (65+):</strong> {formatCurrency(federalTaxData.standard_deduction_extra65)}</p>
                                <p><strong>Net Investment Income Tax Threshold (AGI):</strong> {formatCurrency(federalTaxData.nii)}</p>
                              </div>
                              <div> {/* Placeholder for potential second column general info or keep it for tables */} </div>

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
                            </div>
                          </div>
                        )}
                            <div className="mt-8 flex justify-center" ref={incomeTypeChartRef}></div> {/* Inner div for D3, parent handles centering */}
                            {stateTaxData && (
                              <div className="mt-6 text-sm border-t pt-4">
                                <h4 className="font-semibold text-md mb-2 text-center">State Tax Details ({stateTaxData.status.replace('_', ' ')})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                  <div>
                                    <p><strong>Standard Deduction:</strong> {formatCurrency(stateTaxData.standard_deduction)}</p>
                                    <p><strong>Taxes Retirement Income:</strong> {stateTaxData.taxes_retirement_income ? 'Yes' : 'No'}</p>
                                    <p><strong>Taxes Social Security:</strong> {stateTaxData.taxes_ss ? 'Yes' : 'No'}</p>
                                  </div>

                                  <div className="md:col-span-2"> {/* Make table span full width if only one table */}
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
                            <div className="mt-8 flex justify-center" ref={stateAgiAndCgChartRef}></div> {/* Container for the new State AGI & CG chart */}
                      </CardContent>
                    </Card>
             </div>
          ) : (
             // Show example data if submitted is false and no drawdown plan exists (initial state after accept)
             // Or potentially keep the limitations text until the form is submitted?
             // Let's keep the limitations text until submission for clarity
             // <div className="flex items-center justify-center h-full p-4 text-center">
          <div className="flex flex-col items-start justify-start h-full p-4 gap-4 overflow-y-auto">
            
          </div>
          )
        )}
        </>
        )}
      </SidebarInset>
    </>
  );
}

// --- Original Home Component ---
export default function Home() {
  return (
    // SidebarProvider wraps the AppContent component
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  );
}
