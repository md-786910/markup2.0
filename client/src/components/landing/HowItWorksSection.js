import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: <Plus className="w-6 h-6" />,
    color: 'bg-brand-600',
    textColor: 'text-brand-600',
    title: 'Connect your site',
    desc: 'Just paste your URL. Our lightning-fast relay connects to any live website or web app instantly—no code snippets or plugins required.',
    visual: (
      <div className="relative group">
        <div className="absolute -inset-4 bg-brand-100/50 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative glass-white rounded-[32px] border border-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)]">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Quick Connect</p>
          <div className="space-y-4">
            <div className="h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center px-4 ring-offset-2 ring-brand-500/20 focus-within:ring-4 transition-all">
              <span className="text-xs font-bold text-gray-400">https://</span>
              <span className="text-xs font-bold text-gray-900 ml-1">your-awesome-app.com</span>
            </div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-14 bg-gray-900 rounded-[16px] flex items-center justify-center shadow-xl shadow-gray-950/20 cursor-pointer"
            >
              <span className="text-sm font-black text-white">Analyze Website</span>
            </motion.div>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    icon: <Users className="w-6 h-6" />,
    color: 'bg-indigo-600',
    textColor: 'text-indigo-600',
    title: 'Invite the squad',
    desc: 'Share a secure link with designers, developers, and clients. Everyone can collaborate in a single shared session in real-time.',
    visual: (
      <div className="relative glass-white rounded-[32px] border border-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Session</p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            4 Active
          </div>
        </div>
        <div className="space-y-4">
          {[
            { name: 'Sarah Mitchell', role: 'Designer', img: '21' },
            { name: 'David Wilson', role: 'Developer', img: '32' },
            { name: 'Anna Chen', role: 'Client', img: '44' },
          ].map((m, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={m.name} 
              className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/50 border border-gray-100/50"
            >
              <img src={`https://i.pravatar.cc/100?img=${m.img}`} className="w-8 h-8 rounded-full border-2 border-white" alt="" />
              <div className="flex-1">
                <p className="text-[12px] font-black text-gray-900">{m.name}</p>
                <p className="text-[10px] font-bold text-gray-400">{m.role}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '03',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'bg-brand-600',
    textColor: 'text-brand-600',
    title: 'Annotate & Fix',
    desc: 'Drop pins, leave feedback, and attach media. Mark comments as resolved and track every change request with ease.',
    visual: (
      <div className="relative glass-white rounded-[32px] border border-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Feedback Log</p>
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center text-[9px] font-black">1</span>
              <p className="text-[12px] font-black text-gray-900">Hero Section Layout</p>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Let's move the CTA slightly to the right to balance the design.</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <p className="text-[12px] font-black text-gray-900">Updated Typography</p>
            </div>
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Resolved</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white relative overflow-hidden noise">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest mb-6"
          >
            How it works
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-6"
          >
            Ship better sites in <br />
            <span className="text-brand-600">three simple steps.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base text-gray-500 font-medium leading-relaxed"
          >
            We've redesigned feedback from the ground up to be more natural, collaborative, and fast.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-[1fr,1.1fr] gap-16 lg:gap-20 items-center">
          
          {/* Steps */}
          <div className="relative">
            <div className="absolute left-[27px] top-10 bottom-10 w-px bg-gray-100" />
            
            <div className="space-y-4">
              {steps.map((s, i) => (
                <motion.button
                  key={s.num}
                  onClick={() => setActive(i)}
                  className={`group relative w-full text-left p-6 rounded-[32px] transition-all duration-500 ${
                    active === i 
                      ? 'bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] ring-1 ring-gray-100' 
                      : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    <div className={`relative z-10 w-14 h-14 rounded-[20px] shrink-0 flex items-center justify-center transition-all duration-500 ${
                      active === i 
                        ? 'bg-gray-900 text-white shadow-xl shadow-gray-950/20' 
                        : 'bg-white border-2 border-gray-100 text-gray-300'
                    }`}>
                      {s.icon}
                      <span className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-white ${
                        active === i ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {s.num}
                      </span>
                    </div>
                    
                    <div className="pt-1">
                      <h3 className={`text-xl font-black mb-2 transition-colors ${
                        active === i ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {s.title}
                      </h3>
                      <AnimatePresence>
                        {active === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <p className="text-base text-gray-500 font-medium leading-relaxed mb-4">
                              {s.desc}
                            </p>
                            <div className="flex items-center gap-2 text-brand-600 font-black text-[11px] uppercase tracking-widest group-hover:gap-3 transition-all">
                              Experience it now
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Visual Showcase */}
          <div className="relative lg:sticky lg:top-32">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-20 bg-gradient-to-br from-brand-100/40 to-indigo-100/40 rounded-full blur-[100px] opacity-60" 
            />
            <div className="relative min-h-[500px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-lg"
                >
                  {steps[active].visual}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
