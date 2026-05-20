import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { ArrowRightIcon, ChatIcon, ClockIcon, CodeIcon, FileTextIcon, ShieldIcon, UsersIcon, ZapIcon } from '../components/icons';

const POSTS = [
  {
    title: 'How to run a visual review without losing context',
    category: 'Workflow',
    readTime: '7 min read',
    date: 'May 12, 2026',
    excerpt: 'A practical system for replacing screenshot threads with review sessions that stay anchored to the work.',
    icon: FileTextIcon,
  },
  {
    title: 'Client feedback links that do not create security debt',
    category: 'Security',
    readTime: '6 min read',
    date: 'May 5, 2026',
    excerpt: 'Guest sharing can be low-friction and controlled when passwords, expiration, and project roles are designed together.',
    icon: ShieldIcon,
  },
  {
    title: 'Turning QA notes into developer-ready issues',
    category: 'Engineering',
    readTime: '8 min read',
    date: 'April 28, 2026',
    excerpt: 'What engineers need from visual feedback: viewport, browser, URL, reproduction notes, and a clear owner.',
    icon: CodeIcon,
  },
  {
    title: 'Why review meetings drift and how to tighten them',
    category: 'Workflow',
    readTime: '5 min read',
    date: 'April 17, 2026',
    excerpt: 'Use async review checkpoints, status labels, and decision logs to keep launch approvals moving.',
    icon: ClockIcon,
  },
  {
    title: 'Agency handoff checklist for high-trust approvals',
    category: 'Agency',
    readTime: '9 min read',
    date: 'April 9, 2026',
    excerpt: 'A repeatable checklist for account managers, designers, and developers reviewing client-facing work.',
    icon: UsersIcon,
  },
  {
    title: 'Building better comment threads for product teams',
    category: 'Product',
    readTime: '6 min read',
    date: 'March 26, 2026',
    excerpt: 'Thread quality matters. Clear prompts, ownership, and resolution states prevent good feedback from going stale.',
    icon: ChatIcon,
  },
];

const CATEGORIES = ['All', 'Workflow', 'Agency', 'Product', 'Engineering', 'Security'];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const posts = useMemo(() => (
    activeCategory === 'All' ? POSTS : POSTS.filter((post) => post.category === activeCategory)
  ), [activeCategory]);

  const featuredPost = POSTS[0];
  const FeaturedIcon = featuredPost.icon;

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="site-container relative z-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <span className="eyebrow">Markly blog</span>
                <h1 className="display-heading mt-6">
                  Better review systems for teams that ship web work.
                </h1>
                <p className="body-large mt-6 max-w-2xl">
                  Field-tested advice on visual feedback, client approvals, QA handoff, and collaborative delivery.
                </p>
              </div>
              <article className="premium-card p-6 sm:p-7">
                <div className="icon-tile h-12 w-12">
                  <FeaturedIcon className="h-5 w-5" />
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#2854ff]">Featured</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">{featuredPost.title}</h2>
                <p className="body-copy mt-4">{featuredPost.excerpt}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>{featuredPost.date}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{featuredPost.readTime}</span>
                </div>
                <a href="#articles" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#2854ff]">
                  Browse articles
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="articles" className="soft-band section-pad">
          <div className="site-container">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="eyebrow">Articles</span>
                <h2 className="section-heading mt-5">Latest guidance</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeCategory === category
                        ? 'bg-[#2854ff] text-white shadow-[0_12px_28px_rgba(40,84,255,0.2)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => {
                const Icon = post.icon;
                return (
                  <article key={post.title} className="premium-card hover-lift p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="icon-tile">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{post.category}</span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-semibold leading-tight text-slate-950">{post.title}</h3>
                    <p className="body-copy mt-3">{post.excerpt}</p>
                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{post.date}</span>
                      <span className="font-medium text-slate-600">{post.readTime}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="site-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <ZapIcon className="h-7 w-7 text-[#2854ff]" />
              <h2 className="section-heading mt-5 lg:text-4xl">Get practical review playbooks in your inbox.</h2>
              <p className="body-copy mt-4">
                Monthly notes on making feedback clearer, approvals faster, and stakeholder reviews easier to manage.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="premium-card relative p-5 sm:flex sm:gap-3">
              <label className="sr-only" htmlFor="blog-email">Email address</label>
              <input
                id="blog-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-12 w-full rounded-full border border-slate-200 px-5 text-sm outline-none transition focus:border-[#2854ff]"
              />
              <button type="submit" className="mt-3 h-12 w-full rounded-full bg-[#2854ff] px-6 text-sm font-semibold text-white transition hover:bg-[#1f45dd] sm:mt-0 sm:w-auto">
                Subscribe
              </button>
              {subscribed ? <p className="mt-3 text-sm font-medium text-emerald-600 sm:absolute sm:mt-16">You are on the list.</p> : null}
            </form>
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
