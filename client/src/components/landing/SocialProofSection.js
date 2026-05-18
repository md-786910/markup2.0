import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Markup completely changed how we review client websites. No more back-and-forth emails trying to describe where a bug is. It's magic.",
    name: 'Sarah Mitchell',
    title: 'Lead Designer @ Pixel Studio',
    image: 'https://i.pravatar.cc/150?img=32',
    color: 'brand',
  },
  {
    quote: "Our development sprints are 30% faster since we started using Markup. The annotations are precise and everyone stays aligned effortlessly.",
    name: 'James Wilson',
    title: 'CTO @ TechFlow',
    image: 'https://i.pravatar.cc/150?img=11',
    color: 'indigo',
  },
  {
    quote: "Client approvals used to take weeks of confusing feedback. Now they click once, leave a comment, and we're done. A total game changer.",
    name: 'Priya Sharma',
    title: 'Product Manager @ CreativeWave',
    image: 'https://i.pravatar.cc/150?img=44',
    color: 'blue',
  },
];

const logos = [
  'Stripe', 'Netflix', 'Spotify', 'Slack', 'Adobe', 'Vercel', 'Linear', 'Framer'
];

export default function SocialProofSection() {
  return (
    <section className="py-24 lg:py-32 bg-[#fafafa] relative overflow-hidden noise">
      
      {/* Logos Marquee */}
      <div className="mb-24">
        <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10">Trusted by 2,000+ world-class teams</p>
        
        <div className="relative flex overflow-hidden group">
          <motion.div
            className="flex whitespace-nowrap gap-12 lg:gap-24 py-6 items-center"
            animate={{ x: [0, -1600] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 50,
                ease: 'linear',
              },
            }}
          >
            {[...logos, ...logos, ...logos].map((name, i) => (
              <span 
                key={`${name}-${i}`} 
                className="text-2xl lg:text-3xl font-black text-gray-200 hover:text-gray-400 transition-colors cursor-default tracking-tighter"
              >
                {name}
              </span>
            ))}
          </motion.div>
          
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#fafafa] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#fafafa] to-transparent z-10" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest mb-6"
            >
              Testimonials
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-black text-gray-900 tracking-tight"
            >
              Loved by <span className="text-gray-400">creators</span> <br />everywhere.
            </motion.h2>
          </div>
        </div>

        {/* Testimonials Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 items-start">
          {testimonials.map((t, i) => (
            <motion.div 
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8 }}
              className={`relative p-8 lg:p-10 rounded-[32px] bg-white border border-gray-100 transition-all hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] ${
                i === 0 ? 'md:col-span-6 lg:col-span-7' : 
                i === 1 ? 'md:col-span-3 lg:col-span-5' : 
                'md:col-span-3 lg:col-span-12 lg:max-w-xl'
              }`}
            >
              <Quote className={`w-10 h-10 mb-6 opacity-10 ${
                t.color === 'brand' ? 'text-brand-600' : 
                t.color === 'indigo' ? 'text-indigo-600' : 'text-blue-600'
              }`} />

              <p className="text-lg lg:text-xl font-bold text-gray-800 leading-tight mb-10 tracking-tight">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-gray-50 shadow-sm ring-1 ring-gray-100">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{t.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="md:col-span-6 lg:col-span-5 p-10 rounded-[32px] bg-gray-900 text-white flex flex-col justify-center items-center text-center shadow-2xl shadow-gray-950/20"
          >
            <div className="text-5xl font-black mb-1 tracking-tighter">4.9/5</div>
            <div className="flex text-amber-400 gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-base text-white/60 font-medium leading-relaxed">
              Based on 500+ reviews on <br />G2 and Capterra.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
