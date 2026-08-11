"use client";
import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  useSidebar,
} from "@/components/ui/sidebar";
import { DisclaimerContent } from '@/components/disclaimer-content';
import { DrawdownPlanForm } from "@/components/drawdown-plan-form";
import { calculateDrawdownPlan, DrawdownPlanInput, DrawdownPlanYear, DrawdownPlanResponse, FederalTaxData, StateTaxData } from "@/services/drawdown-plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Loader2 } from "lucide-react";
import { AlertTriangle, Info } from "lucide-react";

// Dynamically import DrawdownCharts so D3 is not loaded until charts are rendered
const DrawdownCharts = dynamic(
  () => import("@/components/drawdown-charts"),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-primary/30 p-8 text-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#00c0c0]" />
        <span>Loading interactive charts...</span>
      </div>
    ),
    ssr: false,
  }
);

// --- AppContent Component ---
function AppContent() {
  const [drawdownPlan, setDrawdownPlan] = useState<DrawdownPlanYear[] | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [spendingFloor, setSpendingFloor] = useState<number | undefined>(undefined);
  const [endOfPlanAssets, setEndOfPlanAssets] = useState<number | undefined>(undefined);
  const [planStatus, setPlanStatus] = useState<string | undefined>(undefined);
  const [currentObjectiveType, setCurrentObjectiveType] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isFormEdited, setIsFormEdited] = useState(false);
  const [submittedSocialSecurityStartAge, setSubmittedSocialSecurityStartAge] = useState<number | null>(null);
  const [submittedBirthMonth, setSubmittedBirthMonth] = useState<number | null>(null);
  const [submittedCurrentAge, setSubmittedCurrentAge] = useState<number | null>(null);
  const [cardMilestoneMessages, setCardMilestoneMessages] = useState<string[]>([]);
  const [federalTaxData, setFederalTaxData] = useState<FederalTaxData | null>(null);
  const [stateTaxData, setStateTaxData] = useState<StateTaxData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const { setOpen, toggleSidebar } = useSidebar();

  useEffect(() => {
    if (pageRef.current && (loading || errorMessage || (submitted && drawdownPlan && !errorMessage))) {
        requestAnimationFrame(() => {
          pageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
  }, [submitted, drawdownPlan, errorMessage, loading]);

  const handleSubmit = async (input: DrawdownPlanInput) => {
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
  };
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
              onFormEdit={() => setIsFormEdited(true)} // Pass the callback
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
          (<>
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
                <DrawdownCharts
                  drawdownPlan={drawdownPlan}
                  federalTaxData={federalTaxData}
                  stateTaxData={stateTaxData}
                  cardMilestoneMessages={cardMilestoneMessages}
                  isFormEdited={isFormEdited}
                  currentObjectiveType={currentObjectiveType}
                  spendingFloor={spendingFloor}
                  endOfPlanAssets={endOfPlanAssets}
                />
              ) : (
                <div className="flex flex-col items-start justify-start h-full p-4 gap-4 overflow-y-auto">
                </div>
              )
            )}
          </>)
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
