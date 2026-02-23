import { formSchema } from "@/lib/form-schema";

/**
 * Represents the user's input data for generating a drawdown plan.
 */
export interface DrawdownPlanInput {
  /**
   * Information about the user.
   */
  about: About;
  /**
   * Social security details.
   */
  social_security: SocialSecurity;
  /**
   * Prediction parameters.
   */
  predictions: Predictions;
  /**
   * Brokerage account details.
   */
  brokerage: Brokerage;
  /**
   * Traditional IRA account details.
   */
  IRA: IRA;
  /**
   * Roth account details.
   */
  Roth: Roth;

  ACA: ACA;

  cash: Cash;

  roth_conversion_preference: string;

  spending_preference: string;
  
  pessimistic: Pessimistic;

  annual_spending: number;
}

export interface Pessimistic {
  taxes: boolean;
  healthcare: boolean;
}
export interface About {
    /**
     * The age of the user.
     */
    age: number;
    /**
     * The birth month of the user.
     */
    birth_month: string;
    /**
     * The age at the end of the plan.
     */
    end_of_plan_age: number;
    /**
     * The filing status of the user.
     */
    filing_status: string;
    /**
     * The state of residence of the user.
     */
    state_of_residence: string;
}

export interface SocialSecurity {
    /**
     * The amount of social security benefit.
     */
    amount: number;
    /**
     * The age when social security starts.
     */
    starts: number;
}

export interface Predictions {
    /**
     * The expected inflation rate.
     */
    inflation: number;
    /**
     * The expected rate of return.
     */
    returns: number;
}

export interface Brokerage {
    /**
     * The balance in the brokerage account.
     */
    balance: number;
    /**
     * The cost basis of the brokerage account.
     */
    basis: number;
    /**
     * The percent of the account that will be returned to the user in the form of capital gains and dividends each year.
     */
    distributions: number;
}

export interface IRA {
    /**
     * The balance in the traditional IRA account.
     */
    balance: number;
}

export interface ACA {
    premium: number;
    slcsp: number;
    people_covered: number;
}

export interface Cash {
    amount: number;
}

export interface Roth {
    /**
     * The balance in the Roth account.
     */
    balance: number;
    /**
     * The year when the first contribution was made.
     */
    conversion_year_minus_4: number;
    conversion_year_minus_3: number;
    conversion_year_minus_2: number;
    conversion_year_minus_1: number;
    /**
     * The amount of conversions older than 5 years old.
     */
    old_conversions: number;
}

/**
 * Represents a year in the drawdown plan.
 */
export interface DrawdownPlanYear {
  /**
   * The age of the retiree.
   */
  age: number;
  /**
   * The amount withdrawn from cash reserves.
   */
  Cash_Withdraw: number;
  /**
   * The brokerage account balance.
   */
  Brokerage_Balance: number;
  /**
   * The amount withdrawn from the brokerage account.
   */
  Brokerage_Withdraw: number;
  /**
   * The IRA balance.
   */
  IRA_Balance: number;
  /**
   * The amount withdrawn from the IRA.
   */
  IRA_Withdraw: number;
  /**
   * The Roth account balance.
   */
  Roth_Balance: number;
  /**
   * The amount withdrawn from the Roth account.
   */
  Roth_Withdraw: number;
  /**
   * The amount converted from IRA to Roth.
   */
  IRA_to_Roth: number;
  /**
   * The spendable amount from capital gains distributions.
   */
  CGD_Spendable: number;
  /**
   * The total capital gains distribution amount.
   */
  Capital_Gains_Distribution: number;
  /**
   * The total capital gains realized.
   */
  Total_Capital_Gains: number;
  /**
   * The ordinary income amount.
   */
  Ordinary_Income: number;
  /**
   * The Federal Adjusted Gross Income.
   */
  Fed_AGI: number;
  /**
   * The social security income.
   */
  Social_Security: number;
  /**
   * The federal tax amount.
   */
  Fed_Tax: number;

  State_AGI: number;
  /**
   * The state tax amount.
   */
  State_Tax: number;
  /**
   * The total tax amount.
   */
  Total_Tax: number;
  /**
   * The ACA healthcare payment amount.
   */
  ACA_HC_Payment: number;
  /**
   * The ACA help/subsidy amount.
   */
  ACA_Help: number;
  /**
   * The actual spending amount for the year.
   */
  Available_Spending: number;

  IRA_RMD: number;

  Excess: number;
}

// You might want to place this interface in a shared types file or at the top of page.tsx
export interface TaxBracketTuple extends Array<number> {
  0: number; // rate
  1: number; // from (income)
  2: number; // to (income)
}

export interface FederalTaxData {
  cg_taxtable: TaxBracketTuple[];
  nii: number; // Net Investment Income tax threshold
  standard_deduction: number;
  standard_deduction_extra65: number;
  status: string; // e.g., "Single", "MFJ"
  taxtable: TaxBracketTuple[]; // Ordinary income tax brackets
}

export interface StateTaxData {
  standard_deduction: number;
  status: string; // e.g., "DC_Single"
  taxes_retirement_income: boolean;
  taxes_ss: boolean;
  taxtable: TaxBracketTuple[];
}
export interface DrawdownPlanResponse {
  planYears: DrawdownPlanYear[];
  spendingFloor?: number;
  endOfPlanAssets?: number;
  status?: string;
  federal?: FederalTaxData;
  state?: StateTaxData;
}

// At the top of your file, or in a central config file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || process.env.API_BASE_URL || 'http://localhost:5001';
// The fallbacks ensure it works in various setups and defaults to localhost if no env var is set.
// Adjust NEXT_PUBLIC_API_URL or REACT_APP_API_URL based on your framework, or use a custom one.
/**
 * Asynchronously calculates the drawdown plan based on user input.
 *
 * @param input The user's input data.
 * @returns A promise that resolves to a DrawdownPlanResponse.
 */
export async function calculateDrawdownPlan(payload: any): Promise<DrawdownPlanResponse> {
  // Validate the payload against the schema to ensure data integrity
  const validatedPayload = formSchema.parse(payload);

  const calculateUrl = `${API_BASE_URL}/calculate`; // Construct the URL

  const response = await fetch(calculateUrl, { // Use the constructed URL
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validatedPayload),
  });
  // console.log(response);
  if (!response.ok) {
    // Attempt to parse error message from backend if available
    let errorMessage = `HTTP error! status: ${response.status} from ${calculateUrl}`; // Include URL in error
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If parsing error JSON fails, stick with the HTTP status
      console.error("Could not parse error response JSON:", e);
    }
    throw new Error(errorMessage);
  }

  const everything = await response.json();
  const rawData: { retire: { [key: string]: any }, federal: FederalTaxData, state: StateTaxData, spending_floor?: number, endofplan_assets?: number, status?: string } = everything;

  // console.log('Everything:', everything);
  // console.log('Raw data:', rawData);

  // Transform the rawData into DrawdownPlanYear[]
  const formattedPlan: DrawdownPlanYear[] = Object.keys(rawData.retire)
    .map(yearIndex => {
      const yearData = rawData.retire[yearIndex];
      // Assuming the 'age' is the yearIndex + startAge from the original input.
      // This might need adjustment if 'age' is directly available in yearData.
      // For now, let's assume 'age' is part of yearData or we derive it.
      // If 'age' is not in yearData, you'll need to pass startAge to this function
      // or find another way to determine it.
      // Let's assume for now 'age' is directly in yearData or we'll add it.
      // If 'age' is missing, you might need to add it based on the key, e.g.
      // const age = parseInt(yearIndex) + (payload.startage || some_default_start_age);
      return {
        age: yearData.age || (parseInt(yearIndex) + (payload.startage || 0)), // Example: derive age if not present
        Cash_Withdraw: yearData.Cash_Withdraw,
        Brokerage_Balance: yearData.Brokerage_Balance,
        Brokerage_Withdraw: yearData.Brokerage_Withdraw,
        IRA_Balance: yearData.IRA_Balance,
        IRA_RMD: yearData.Required_RMD,
        IRA_Withdraw: yearData.IRA_Withdraw,
        IRA_to_Roth: yearData.IRA_to_Roth,
        Roth_Balance: yearData.Roth_Balance,
        Roth_Withdraw: yearData.Roth_Withdraw,
        CGD_Spendable: yearData.CGD_Spendable,
        Capital_Gains_Distribution: yearData.Capital_Gains_Distribution,
        Total_Capital_Gains: yearData.Total_Capital_Gains,
        Ordinary_Income: yearData.Ordinary_Income,
        Fed_AGI: yearData.Fed_AGI,
        Fed_Tax: yearData.Fed_Tax,
        State_AGI: yearData.State_AGI,
        State_Tax: yearData.State_Tax,
        Total_Tax: yearData.Total_Tax,
        Social_Security: yearData.Social_Security,
        ACA_HC_Payment: yearData.ACA_HC_Payment,
        ACA_Help: yearData.ACA_Help,
        Available_Spending: yearData.True_Spending,
        Excess: yearData.Excess,
      };
    })
    .sort((a, b) => a.age - b.age); // Ensure sorted by age

  return {
    planYears: formattedPlan,
    spendingFloor: rawData.spending_floor,
    endOfPlanAssets: rawData.endofplan_assets,
    status: rawData.status,
    federal: rawData.federal,
    state: rawData.state,
  };
}