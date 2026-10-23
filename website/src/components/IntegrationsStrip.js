import React from 'react';
import { SlackIcon, DiscordIcon, JiraIcon, TeamsIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const INTEGRATIONS = [
  [SlackIcon, 'Slack', 'New pins and comments in a channel'],
  [JiraIcon, 'Jira', 'An issue for every new pin'],
  [DiscordIcon, 'Discord', 'Review updates in your server'],
  [TeamsIcon, 'Microsoft Teams', 'Notifications in a team channel'],
];

export default function IntegrationsStrip() {
  const ref = useScrollReveal();
  return (
    <section id="integrations" className="section-pad scroll-mt-24" ref={ref}>
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="eyebrow">Integrations</span>
          <h2 className="section-heading mt-5">Feedback lands where your team already works.</h2>
          <p className="body-large mt-4">Connect once for the whole workspace or per project. Included from the Starter plan.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map(([Icon, name, copy], index) => (
            <div key={name} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5" data-reveal data-delay={String(index + 1)}>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-slate-50">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-950">{name}</p>
                <p className="text-sm text-slate-500">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
