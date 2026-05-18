import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { ArrowRight, Star, MousePointer2, CheckCircle2 } from 'lucide-react';

export default function HeroSection() {
  const containerRef = useRef(null);

  // Mouse parallax setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX / innerWidth - 0.5);
    mouseY.set(clientY / innerHeight - 0.5);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const dx = useSpring(useTransform(mouseX, [-0.5, 0.5], [-20, 20]), springConfig);
  const dy = useSpring(useTransform(mouseY, [-0.5, 0.5], [-20, 20]), springConfig);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden bg-[#fafafa] noise"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated Blobs with Parallax */}
        <motion.div
          style={{ x: useTransform(dx, (v) => v * -1.5), y: useTransform(dy, (v) => v * -1.5) }}
          className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] bg-gradient-to-br from-brand-100/30 to-transparent rounded-full blur-[120px]"
        />
        <motion.div
          style={{ x: useTransform(dx, (v) => v * 2), y: useTransform(dy, (v) => v * 2) }}
          className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-gradient-to-bl from-indigo-100/40 to-transparent rounded-full blur-[100px]"
        />
        <motion.div
          style={{ x: useTransform(dx, (v) => v * 1), y: useTransform(dy, (v) => v * 1) }}
          className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-gradient-to-tr from-purple-100/20 to-transparent rounded-full blur-[100px]"
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
          style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-12 lg:gap-20 items-center">

          {/* Left Column: Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Trust Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 20}`} className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-gray-100" alt="User" />
                ))}
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Joined by 12,000+ designers</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-8"
            >
              Visual feedback <br />
              <span className="relative">
                without the
                <span className="text-brand-600"> chaos.</span>
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="absolute -bottom-2 left-0 w-full" viewBox="0 0 358 8" fill="none"
                >
                  <path d="M1 5.26C72.3333 2.59333 215.4 -1.74 357 6.26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-brand-200" />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10"
            >
              The most natural way to collaborate on live websites. Just point, click, and discuss. No more endless screenshots or confusing email threads.
            </motion.p>

            {/* Main Action Area */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 mb-12 justify-center lg:justify-start">
              <Link
                to="/onboarding"
                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg transition-all hover:bg-brand-600 hover:-translate-y-1 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-brand-500/40 active:scale-95 btn-shimmer overflow-hidden w-full sm:w-auto"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 text-gray-900 font-bold">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>4.9/5 Rating</span>
                </div>
                <span className="text-sm text-gray-400 font-medium">No credit card required</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Interactive Mockup */}
          <motion.div
            style={{ x: dx, y: dy }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* The "Floating" Card */}
            <div className="relative z-10 rounded-[48px] bg-white p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] ring-1 ring-gray-200/50">
              <div className="relative rounded-[40px] overflow-hidden bg-gray-50 border border-gray-100">
                {/* Browser UI */}
                <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
                    <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200" />
                    <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200" />
                  </div>
                  <div className="flex-1 max-w-md mx-6">
                    <div className="h-9 bg-gray-50 rounded-2xl flex items-center px-4 border border-gray-100/50">
                      <span className="text-[11px] font-bold text-gray-400 tracking-wide">acme-design.studio</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100" />
                </div>

                {/* Mock Website Content */}
                <div className="p-10 min-h-[500px] relative">
                  <div className="space-y-6">
                    <div className="h-10 w-2/3 bg-gray-200/50 rounded-[16px]" />
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-gray-200/30 rounded-lg" />
                      <div className="h-4 w-5/6 bg-gray-200/30 rounded-lg" />
                      <div className="h-4 w-4/6 bg-gray-200/30 rounded-lg" />
                    </div>
                    <div className="pt-8 flex gap-4">
                      <div className="h-14 w-40 bg-gray-900 rounded-[20px]" />
                      <div className="h-14 w-14 bg-white rounded-[20px] border border-gray-200" />
                    </div>
                  </div>

                  {/* Dynamic Cursor */}
                  <motion.div
                    className="absolute z-50 pointer-events-none drop-shadow-2xl"
                    animate={{
                      x: [100, 500, 200, 100],
                      y: [300, 100, 400, 300],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <MousePointer2 className="w-8 h-8 text-gray-900 fill-white" />
                  </motion.div>

                  {/* Interactive Pins */}
                  <Pin
                    number="1"
                    top="15%"
                    left="65%"
                    delay={1.5}
                    author="Alex R."
                    comment="Can we try a softer shadow here? 🎨"
                    color="brand"
                  />
                  <Pin
                    number="2"
                    top="65%"
                    left="25%"
                    delay={2.5}
                    author="Sarah M."
                    comment="This button interaction feels so smooth! ✨"
                    color="indigo"
                    resolved
                  />
                </div>
              </div>
            </div>

            {/* Decorative Background Accents */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-64 h-64 bg-brand-50/50 rounded-full blur-[80px] -z-10"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-50/50 rounded-full blur-[80px] -z-10"
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

function Pin({ number, top, left, delay, author, comment, color, resolved }) {
  const colors = {
    brand: 'bg-brand-600 ring-brand-500/20 text-brand-600',
    indigo: 'bg-indigo-600 ring-indigo-500/20 text-indigo-600',
  };

  return (
    <motion.div
      className="absolute z-20"
      style={{ top, left }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.6, type: "spring" }}
    >
      <div className="relative group">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-10 h-10 rounded-[16px] ${colors[color].split(' ')[0]} border-4 border-white shadow-2xl flex items-center justify-center text-white font-black text-base cursor-pointer ring-[10px] ${colors[color].split(' ')[1]}`}
        >
          {number}
        </motion.div>

        <motion.div
          className="absolute top-14 -left-4 w-60 glass-white rounded-[28px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl ${colors[color].split(' ').slice(-1)} bg-current/10 flex items-center justify-center font-bold text-xs`}>
                {author[0]}
              </div>
              <span className="text-sm font-bold text-gray-900">{author}</span>
            </div>
            {resolved && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">{comment}</p>
          {resolved && (
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                Resolved
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
