import React from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointer2, 
  Users2, 
  Layers, 
  UserPlus, 
  Code2,
  Sparkles
} from 'lucide-react';

export default function FeaturesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <section id="features" className="py-24 lg:py-32 bg-[#fafafa] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-bold uppercase tracking-wider mb-6"
            >
              <Sparkles className="w-3 h-3" />
              Supercharged Workflow
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight tracking-tight"
            >
              Everything you need to ship <br />
              <span className="text-gray-400">pixel-perfect</span> websites.
            </motion.h2>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base text-gray-500 max-w-sm font-medium leading-relaxed"
          >
            Built for teams who care about quality. Packed with tools that make collaboration feel like a breeze.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6"
        >
          {/* Main Feature - Large */}
          <FeatureCard 
            className="md:col-span-6 lg:col-span-8 bg-white"
            icon={<MousePointer2 className="w-6 h-6" />}
            title="Click-to-pin Annotations"
            desc="The most natural way to give feedback. Just click anywhere on your live website to drop a pin and start a discussion. No more screenshots, no more confusion."
            badge="Most Loved"
            color="brand"
          />

          {/* Collaboration - Square */}
          <FeatureCard 
            className="md:col-span-3 lg:col-span-4 bg-gray-900 text-white border-none shadow-2xl shadow-gray-950/20"
            icon={<Users2 className="w-6 h-6" />}
            title="Real-time Teamwork"
            desc="Discuss and iterate with your team instantly. Everyone stays in sync without ever leaving the browser tab."
            color="white"
          />

          {/* Guest Invites - Small */}
          <FeatureCard 
            className="md:col-span-3 lg:col-span-4 bg-white"
            icon={<UserPlus className="w-5 h-5" />}
            title="Guest Access"
            desc="Invite clients and stakeholders to review with a simple link. They don't even need an account."
            color="indigo"
          />

          {/* Tech Details - Medium */}
          <FeatureCard 
            className="md:col-span-6 lg:col-span-5 bg-white"
            icon={<Code2 className="w-5 h-5" />}
            title="Developer-First Insights"
            desc="We automatically capture technical details like browser, screen size, and OS for every single comment."
            color="blue"
          />

          {/* Multi-project - Smallish */}
          <FeatureCard 
            className="md:col-span-6 lg:col-span-3 bg-white"
            icon={<Layers className="w-5 h-5" />}
            title="Project Hub"
            desc="Manage feedback for all your websites from one central, organized dashboard."
            color="violet"
          />

        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, className, badge, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    white: 'bg-white/10 text-white',
  };

  return (
    <motion.div
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
      }}
      whileHover={{ y: -5 }}
      className={`relative group p-8 lg:p-10 rounded-[32px] border border-gray-100 transition-all duration-300 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] ${className}`}
    >
      {badge && (
        <span className="absolute top-6 right-6 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
          {badge}
        </span>
      )}
      
      <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>

      <h3 className="text-xl font-black mb-3 tracking-tight">{title}</h3>
      <p className={`text-base leading-relaxed font-medium ${className.includes('text-white') ? 'text-white/60' : 'text-gray-500'}`}>
        {desc}
      </p>

      {/* Decorative inner light */}
      <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
