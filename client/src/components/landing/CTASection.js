import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-24 lg:py-32 px-6 lg:px-8 bg-white relative overflow-hidden noise">
      
      {/* Decorative Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-0">
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-brand-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        className="max-w-7xl mx-auto rounded-[48px] bg-gray-900 px-8 py-20 lg:py-28 lg:px-16 text-center relative overflow-hidden shadow-[0_64px_128px_-32px_rgba(0,0,0,0.4)]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        
        {/* Immersive Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1/2 -left-1/4 w-full h-full bg-brand-600/20 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-indigo-600/20 rounded-full blur-[120px]"
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-brand-400 text-[11px] font-black uppercase tracking-[0.3em] mb-10"
          >
            <Sparkles className="w-3.5 h-3.5" /> Stop the chaos today
          </motion.div>

          <motion.h2 
            className="text-4xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            Ready to <span className="text-brand-500">supercharge</span> your<br className="hidden lg:block" /> feedback workflow?
          </motion.h2>

          <motion.p 
            className="text-lg lg:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            Join 2,000+ high-performance teams shipping pixel-perfect sites with Markup. Start your free trial today.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <Link
              to="/onboarding"
              className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-gray-900 font-black text-lg transition-all hover:bg-brand-500 hover:text-white hover:-translate-y-1.5 shadow-2xl shadow-white/5 active:scale-95 btn-shimmer overflow-hidden"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white/5 text-white font-black text-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all active:scale-95"
            >
              Book Demo
            </Link>
          </motion.div>
          
          {/* Trust Row */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 50}`} className="w-8 h-8 rounded-full border-2 border-gray-900" alt="User" />
                ))}
              </div>
              <div className="text-left">
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-0.5 text-center sm:text-left">4.9/5 from 500+ reviews</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">No credit card required</p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
