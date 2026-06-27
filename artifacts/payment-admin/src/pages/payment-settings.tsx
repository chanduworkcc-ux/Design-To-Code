import React, { useState } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SiStripe, SiPaypal, SiRazorpay } from "react-icons/si";
import { ShieldCheck, Server, ToggleLeft, TriangleAlert, X } from "lucide-react";

const formSchema = z
  .object({
    stripeEnabled: z.boolean().default(false),
    stripeSecretKey: z.string().optional(),
    stripePublishableKey: z.string().optional(),
    stripeWebhookSecret: z.string().optional(),

    paypalEnabled: z.boolean().default(false),
    paypalClientId: z.string().optional(),
    paypalSecretKey: z.string().optional(),
    paypalMode: z.boolean().default(false), // false = sandbox, true = live

    razorpayEnabled: z.boolean().default(false),
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    razorpayWebhookSecret: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stripeEnabled) {
      if (!data.stripeSecretKey || !data.stripePublishableKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please enter your Stripe Secret Key and Publishable Key. These are required to process card payments.",
          path: ["stripeSectionError"],
        });
      }
    }
    if (data.paypalEnabled) {
      if (!data.paypalClientId || !data.paypalSecretKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please enter your PayPal Client ID and Secret Key. These are required to accept PayPal express checkouts.",
          path: ["paypalSectionError"],
        });
      }
    }
    if (data.razorpayEnabled) {
      if (!data.razorpayKeyId || !data.razorpayKeySecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please enter your Razorpay Key ID and Key Secret. These are required to accept domestic payments.",
          path: ["razorpaySectionError"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function PaymentSettings() {
  const { toast } = useToast();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stripeEnabled: false,
      stripeSecretKey: "",
      stripePublishableKey: "",
      stripeWebhookSecret: "",
      paypalEnabled: false,
      paypalClientId: "",
      paypalSecretKey: "",
      paypalMode: false,
      razorpayEnabled: false,
      razorpayKeyId: "",
      razorpayKeySecret: "",
      razorpayWebhookSecret: "",
    },
  });

  const { watch, formState } = form;
  const { errors } = formState;

  const stripeEnabled = watch("stripeEnabled");
  const paypalEnabled = watch("paypalEnabled");
  const razorpayEnabled = watch("razorpayEnabled");

  function onSubmit(data: FormValues) {
    setShowWarningBanner(false);
    toast({
      title: "Settings saved successfully",
      description: "Your payment gateway configurations have been updated.",
    });
  }

  function onError(errors: any) {
    // Open modal if any section has validation errors
    if (
      errors.stripeSectionError ||
      errors.paypalSectionError ||
      errors.razorpaySectionError
    ) {
      setShowErrorModal(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Payment Gateway Settings
          </h1>
          <p className="text-slate-500">
            Configure and manage your active payment processors. Enable a
            gateway to configure its required credentials.
          </p>
        </div>

        {showWarningBanner && (
          <div
            className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3.5 text-amber-900"
            data-testid="banner-warning"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="flex-1 text-sm font-medium leading-snug">
              <span className="font-semibold">Action Required:</span> Your payment gateways are currently inactive. Fill out the mandatory credentials below and click &quot;Save&quot; to go live.
            </div>
            <button
              type="button"
              onClick={() => setShowWarningBanner(false)}
              className="ml-auto shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition-colors"
              aria-label="Dismiss warning"
              data-testid="button-dismiss-banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-6"
          >
            {/* Stripe Section */}
            <Card
              className={`border-l-4 transition-colors ${
                stripeEnabled ? "border-l-[#635BFF]" : "border-l-slate-200"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#635BFF]/10 rounded-md">
                    <SiStripe
                      className="w-6 h-6 text-[#635BFF]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stripe Payments</CardTitle>
                    <CardDescription>
                      Accept credit cards, Apple Pay, and Google Pay
                    </CardDescription>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="stripeEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-stripe"
                        />
                      </FormControl>
                      <FormLabel className="font-medium">
                        {field.value ? "Active" : "Disabled"}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CardHeader>
              {stripeEnabled && (
                <CardContent className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stripePublishableKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stripe Publishable Key *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="pk_live_..."
                              {...field}
                              data-testid="input-stripe-pub-key"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stripeSecretKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stripe Secret Key *</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="sk_live_..."
                              {...field}
                              data-testid="input-stripe-sec-key"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="stripeWebhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Server className="w-4 h-4 text-slate-400" />
                          Webhook Secret
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="whsec_..."
                            {...field}
                            data-testid="input-stripe-webhook"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional. Used to verify events came from Stripe.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  {errors.stripeSectionError && (
                    <div
                      className="p-3 mt-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium"
                      data-testid="error-stripe"
                    >
                      {String(errors.stripeSectionError.message)}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* PayPal Section */}
            <Card
              className={`border-l-4 transition-colors ${
                paypalEnabled ? "border-l-[#00457C]" : "border-l-slate-200"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#00457C]/10 rounded-md">
                    <SiPaypal
                      className="w-6 h-6 text-[#00457C]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">PayPal Checkout</CardTitle>
                    <CardDescription>
                      Accept PayPal balances and express checkout
                    </CardDescription>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="paypalEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-paypal"
                        />
                      </FormControl>
                      <FormLabel className="font-medium">
                        {field.value ? "Active" : "Disabled"}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CardHeader>
              {paypalEnabled && (
                <CardContent className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-end mb-2">
                    <FormField
                      control={form.control}
                      name="paypalMode"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full">
                          <FormLabel className="text-xs text-slate-500 font-medium m-0">
                            Sandbox
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="scale-75 origin-center"
                              data-testid="switch-paypal-mode"
                            />
                          </FormControl>
                          <FormLabel className="text-xs text-slate-900 font-semibold m-0">
                            Live
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paypalClientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PayPal Client ID *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="AZ..."
                              {...field}
                              data-testid="input-paypal-client"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paypalSecretKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PayPal Secret Key *</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="EC..."
                              {...field}
                              data-testid="input-paypal-secret"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {errors.paypalSectionError && (
                    <div
                      className="p-3 mt-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium"
                      data-testid="error-paypal"
                    >
                      {String(errors.paypalSectionError.message)}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Razorpay Section */}
            <Card
              className={`border-l-4 transition-colors ${
                razorpayEnabled ? "border-l-[#02042B]" : "border-l-slate-200"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#02042B]/10 rounded-md">
                    <SiRazorpay
                      className="w-6 h-6 text-[#02042B]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Razorpay</CardTitle>
                    <CardDescription>
                      Accept UPI, domestic cards, and NetBanking
                    </CardDescription>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="razorpayEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-razorpay"
                        />
                      </FormControl>
                      <FormLabel className="font-medium">
                        {field.value ? "Active" : "Disabled"}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CardHeader>
              {razorpayEnabled && (
                <CardContent className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="razorpayKeyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razorpay Key ID *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="rzp_live_..."
                              {...field}
                              data-testid="input-razorpay-key"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="razorpayKeySecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razorpay Key Secret *</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="..."
                              {...field}
                              data-testid="input-razorpay-secret"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="razorpayWebhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Server className="w-4 h-4 text-slate-400" />
                          Webhook Secret
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="..."
                            {...field}
                            data-testid="input-razorpay-webhook"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional. Used to verify webhook events from Razorpay.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  {errors.razorpaySectionError && (
                    <div
                      className="p-3 mt-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium"
                      data-testid="error-razorpay"
                    >
                      {String(errors.razorpaySectionError.message)}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto font-medium"
                data-testid="button-submit"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Missing Payment Configuration!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              You cannot save your settings yet. Please fill in all required
              payment gateway details (marked with an asterisk *) to activate
              payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorModal(false)}
              className="bg-slate-900 text-white hover:bg-slate-800"
              data-testid="button-modal-dismiss"
            >
              Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
