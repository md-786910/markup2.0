const Razorpay = require('razorpay');
require('dotenv').config({ path: './.env' });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function run() {
  try {
    // Create Starter Plan
    const starterPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: 'Starter Plan',
        amount: 1200, // $12.00 (in cents/paise)
        currency: 'INR',
      }
    });
    console.log("RAZORPAY_STARTER_PLAN_ID=" + starterPlan.id);

    // Create Pro Plan
    const proPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: 'Pro Plan',
        amount: 2900, // $29.00
        currency: 'INR',
      }
    });
    console.log("RAZORPAY_PRO_PLAN_ID=" + proPlan.id);

    // Update .env file
    const fs = require('fs');
    let env = fs.readFileSync('./.env', 'utf8');
    env = env.replace(/RAZORPAY_STARTER_PLAN_ID=.*/, 'RAZORPAY_STARTER_PLAN_ID=' + starterPlan.id);
    env = env.replace(/RAZORPAY_PRO_PLAN_ID=.*/, 'RAZORPAY_PRO_PLAN_ID=' + proPlan.id);
    fs.writeFileSync('./.env', env);

    // Also update MongoDB PlanConfig
    const mongoose = require('mongoose');
    const PlanConfig = require('../models/PlanConfig');
    await mongoose.connect(process.env.MONGODB_URI);
    await PlanConfig.findOneAndUpdate({ planId: 'starter' }, { razorpayPlanId: starterPlan.id });
    await PlanConfig.findOneAndUpdate({ planId: 'pro' }, { razorpayPlanId: proPlan.id });
    console.log("Successfully updated MongoDB and .env with valid Razorpay Plans!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create plans:", err);
    process.exit(1);
  }
}
run();