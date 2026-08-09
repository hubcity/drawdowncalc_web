import * as z from "zod";

export const formSchema = z.object({
    about: z.object({
      age: z.coerce.number().min(18, { message: "Age must be at least 18" }).max(120, { message: "Age must be at most 120" }),
      birth_month: z.string().refine((val) => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 1 && num <= 12;
      }, { message: "Month must be between 1 and 12" }),
      end_of_plan_age: z.coerce.number().min(18, { message: "Age must be at least 18" }).max(120, { message: "Age must be at most 120" }),
      filing_status: z.enum(["Single", "MFJ"]),
      state_of_residence: z.string().min(2).max(2),
    }),
    social_security: z.object({
      amount: z.coerce.number().min(0, { message: "Cannot be negative" }).max(15000, { message: "This should be a monthly amount." }),
      starts: z.coerce.number().min(-1).max(70),
    }),
    predictions: z.object({
      inflation: z.coerce.number().min(0, { message: "Cannot be negative" }).max(20, { message: "Must be 20% or less" }),
      returns: z.coerce.number().min(-20, { message: "Must be -20% or more" }).max(50, { message: "Must be 50% or less" }),
    }),
    cash: z.object({
      amount: z.coerce.number().min(0, { message: "Cannot be negative" }),
    }),
    brokerage: z.object({
      balance: z.coerce.number().min(0, { message: "Cannot be negative" }),
      basis: z.coerce.number().min(0, { message: "Cannot be negative" }),
      distributions: z.coerce.number().min(0, { message: "Cannot be negative" }).max(100, { message: "Must be 100% or less" }),
    }),
    IRA: z.object({
      balance: z.coerce.number().min(0, { message: "Cannot be negative" }),
    }),
    Roth: z.object({
      balance: z.coerce.number().min(0, { message: "Cannot be negative" }),
      old_conversions: z.coerce.number().min(0, { message: "Cannot be negative" }),
      conversion_year_minus_1: z.coerce.number().min(0, { message: "Cannot be negative" }),
      conversion_year_minus_2: z.coerce.number().min(0, { message: "Cannot be negative" }),
      conversion_year_minus_3: z.coerce.number().min(0, { message: "Cannot be negative" }),
      conversion_year_minus_4: z.coerce.number().min(0, { message: "Cannot be negative" }),

    }),
    ACA: z.object({
      premium: z.coerce.number().min(0, { message: "Cannot be negative" }).max(10000, { message: "This should be a monthly amount." }),
      slcsp: z.coerce.number().min(0, { message: "Cannot be negative" }).max(10000, { message: "This should be a monthly amount." }),
      people_covered: z.coerce.number().min(1, { message: "Must cover at least 1 person" }).max(8, { message: "Can cover up to 8 people" }).optional(),
    }).optional(),
    roth_conversion_preference: z.enum(["anytime", "before_socsec", "never"]),
    spending_preference: z.enum(["max_spend", "max_assets"]),
    annual_spending: z.coerce.number().min(0, { message: "Cannot be negative" }).optional(),
    pessimistic: z.object({
      taxes: z.boolean(),
      healthcare: z.boolean(),
    }),
  }).refine((schema) =>
    (schema.social_security.starts >= schema.about.age) ||
    schema.social_security.starts === -1, {
    message: "Make a selection",
    path: ["social_security.starts"]
});

export const defaultFormValues: z.infer<typeof formSchema> = {
    about: { age: 59, birth_month: "1", end_of_plan_age: 89, filing_status: "Single", state_of_residence: "FL" },
    social_security: { amount: 3000, starts: 70 },
    predictions: { inflation: 2.8, returns: 6.5 },
    cash: { amount: 0 },
    brokerage: { balance: 0, basis: 0, distributions: 6.0 },
    IRA: { balance: 600000 },
    Roth: {
        balance: 600000,
        old_conversions: 1,
        conversion_year_minus_1: 0,
        conversion_year_minus_2: 0,
        conversion_year_minus_3: 0,
        conversion_year_minus_4: 0,
    },
    ACA: { premium: 0, slcsp: 0, people_covered: 1 },
    spending_preference: "max_spend",
    annual_spending: 70000,
    pessimistic: { taxes: false, healthcare: false },
    roth_conversion_preference: "anytime",
};
