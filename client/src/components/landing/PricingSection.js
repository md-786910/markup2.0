import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, ShieldCheck } from 'lucide-react';

const plans = [
  {
    id: 'trial',
    name: 'Explorer',
    price: '$0',
    period: '/month',
    desc: 'Perfect for small side projects and exploring the power of visual feedback.',
    features: ['3 active projects', '5 team members', 'Unlimited guest seats', 'All core features', 'Standard support'],
    cta: 'Get Started',
    ctaTo: '/onboarding',
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Growth',
    price: '$19',
    period: '/month',
    desc: 'For growing teams shipping daily and needing more scale and speed.',
    features: ['15 projects', '25 team members', 'Unlimited guest seats', 'Priority support', 'Custom workspace logo', 'Project archiving'],
    cta: 'Choose Growth',
    ctaTo: '/onboarding',
    highlighted: true,
    badge: 'Best Value',
    color: 'brand',
  },
  {
    id: 'pro',
    name: 'Scale',
    price: '$49',
    period: '/month',
    desc: 'For agencies and organizations managing complex enterprise workflows.',
    features: ['Unlimited projects', 'Unlimited members', 'Unlimited guest seats', 'Advanced security', 'API access', 'Dedicated manager', 'SSO & SAML'],
    cta: 'Go Pro',
    ctaTo: '/onboarding',
    highlighted: false,
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white relative overflow-hidden noise">
      {/* Decorative Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[10%] right-[5%] w-[30%] h-[30%] bg-brand-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] bg-indigo-50/50 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest mb-6"
          >
            Pricing Plans
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-8"
          >
            Simple, transparent <br />
            <span className="text-brand-600">pricing for everyone.</span>
          </motion.h2>
          
          {/* Enhanced Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-bold transition-colors ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6.5 bg-gray-100 rounded-full p-1 transition-all group overflow-hidden shadow-inner"
            >
              <motion.div
                animate={{ x: annual ? 24 : 0 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                className="w-4.5 h-4.5 bg-white rounded-full shadow-md z-10 relative"
              />
              <div className={`absolute inset-0 transition-all duration-500 ${annual ? 'bg-brand-500' : 'bg-gray-200'}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold transition-colors ${annual ? 'text-gray-900' : 'text-gray-400'}`}>Annually</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                -20% Off
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8 }}
              className={`relative flex flex-col p-8 lg:p-10 rounded-[32px] border transition-all duration-500 ${
                plan.highlighted 
                ? 'border-gray-900 bg-gray-900 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] z-20' 
                : 'border-gray-100 bg-white hover:border-gray-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03)]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-xl shadow-brand-500/30 flex items-center gap-2">
                    <Zap className="w-2.5 h-2.5 fill-current" /> {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-8 text-center lg:text-left">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${plan.highlighted ? 'text-brand-400' : 'text-gray-400'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline justify-center lg:justify-start gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={annual}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-5xl font-black tracking-tighter"
                    >
                      {annual && plan.id !== 'trial' 
                        ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}` 
                        : plan.price}
                    </motion.span>
                  </AnimatePresence>
                  <span className={`text-sm font-bold ${plan.highlighted ? 'text-white/40' : 'text-gray-400'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <p className={`text-[15px] leading-relaxed font-medium mb-8 ${plan.highlighted ? 'text-white/60' : 'text-gray-500'}`}>
                {plan.desc}
              </p>

              <div className={`h-px w-full mb-8 ${plan.highlighted ? 'bg-white/10' : 'bg-gray-50'}`} />

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                      plan.highlighted ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'
                    }`}>
                      <Check className="w-3 h-3" strokeWidth={4} />
                    </div>
                    <span className={plan.highlighted ? 'text-white' : 'text-gray-900'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaTo}
                className={`w-full py-4 rounded-2xl text-center font-black transition-all duration-300 text-sm shadow-xl active:scale-95 ${
                  plan.highlighted 
                  ? 'bg-white text-gray-900 hover:bg-brand-500 hover:text-white shadow-white/5' 
                  : 'bg-gray-900 text-white hover:bg-brand-600 shadow-gray-950/10'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Security Footer */}
        <motion.div 
          className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-50/50 border border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
            Bank-grade Security
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-50/50 border border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
            30-Day Money Back Guarantee
          </div>
        </motion.div>
      </div>
    </section>
  );
}
