import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { ArrowRightIcon, CheckIcon, PinIcon, UsersIcon, ShieldIcon, ZapIcon } from '../components/icons';

// Only claims the product backs: no invented team, numbers or customers.
const PRINCIPLES = [
  {
    icon: PinIcon,
    title: 'Feedback belongs on the work',
    copy: 'A comment means most when it sits on the exact spot it is about, with the page, the device size and a screenshot attached. No more "the button near the top, on mobile, I think".',
  },
  {
    icon: ZapIcon,
    title: 'Nothing to install',
    copy: 'Paste a link and start. No script on your site, no browser extension for your clients, no setup call. The faster a review starts, the faster it ends.',
  },
  {
    icon: UsersIcon,
    title: 'Clients are part of the team',
    copy: 'The people who sign off should find it as easy as the people who build. Clients review with a link, without an account, and their notes land next to yours.',
  },
  {
    icon: ShieldIcon,
    title: 'Your work stays yours',
    copy: 'Access is explicit: workspaces, levels and password-protected links. You can export everything or delete your organization from settings at any time.',
  },
];

const PROMISES = [
  'A free plan and a 30-day Pro trial, no credit card',
  'Prices on the website, monthly, cancel any time',
  'No tracking cookies unless you allow them',
  'A real person answers support, usually within one business day',
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <span className="eyebrow">About Kommently</span>
            <h1 className="display-heading mt-6">We make website feedback clear, fast and finished.</h1>
            <p className="body-large mx-auto mt-6 max-w-2xl">
              Kommently is a visual feedback tool for agencies, product teams and everyone who reviews websites,
              PDFs and images with their clients.
            </p>
          </div>
        </section>

        <section className="section-pad pt-0">
          <div className="site-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="eyebrow">Why we built it</span>
              <h2 className="section-heading mt-5">Reviews shouldn't live in screenshots and email threads.</h2>
            </div>
            <div className="space-y-5 text-[17px] leading-8 text-slate-600">
              <p>
                Anyone who has shipped a website knows the routine: a client sends a screenshot with a red circle, a
                teammate replies in a chat, someone else forwards an email with &ldquo;a few small changes&rdquo;. By
                the third round nobody is sure which comment is still open, or which page it was about.
              </p>
              <p>
                We built Kommently so the feedback stays on the work itself. Open the live site or the PDF, click the
                spot you mean and write your note. Everyone sees the same thread, with the context attached, and the
                comment is resolved when the fix is live.
              </p>
              <p>
                Everything else follows from that: client review links that need no account, a workspace for every
                client, clear access for each person, and the integrations your team already uses.
              </p>
            </div>
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">What we believe</span>
              <h2 className="section-heading mt-5">Four ideas behind every feature.</h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {PRINCIPLES.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
                  <span className="icon-tile">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <span className="eyebrow">How we work with you</span>
              <h2 className="section-heading mt-5">Straightforward, from the first click to the invoice.</h2>
              <p className="body-large mt-4">
                No sales call to get started and no surprises later. If something isn&rsquo;t clear, ask us.
              </p>
            </div>
            <ul className="space-y-3">
              {PROMISES.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-[15px] text-slate-700">
                  <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#003dff]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pb-16 sm:pb-20 lg:pb-24">
          <div className="site-container">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-950">Talk to us</h2>
                <p className="mt-2 text-slate-600">
                  Questions, feedback on the product, or a partnership idea: write to{' '}
                  <a href="mailto:hello@kommently.app" className="font-medium text-[#003dff] hover:underline">hello@kommently.app</a>.
                </p>
              </div>
              <Link to="/support#contact" className="button-secondary shrink-0">
                Contact form
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
