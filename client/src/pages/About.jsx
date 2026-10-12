import React from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackgroundSlider from '../components/layout/BackgroundSlider';

const features = [
  {
    icon: FileCheck2,
    title: 'AI Receipt & Invoice Verification',
    description:
      'Upload supported receipt or invoice documents for AI-assisted information extraction and analysis. Review the results carefully before relying on them for financial decisions.',
  },
  {
    icon: FilePlus2,
    title: 'Professional Invoice Generator',
    description:
      'Prepare clear business invoices with customer and business details, line items, totals, and downloadable documents.',
    link: '/invoice-generator',
    linkLabel: 'Create an invoice',
  },
  {
    icon: Sparkles,
    title: 'Photo Enhancement',
    description:
      'Use image-enhancement tools designed to improve the clarity and presentation of supported photos.',
  },
  {
    icon: MessageCircle,
    title: 'Direct Messaging & Community Chat',
    description:
      'Connect with members through direct conversations and topic-based rooms for general, entertainment, relationships, music, learning, technology, and business discussions.',
  },
  {
    icon: Users,
    title: 'Profiles & Connections',
    description:
      'Create a profile, discover other members, build connections, and grow your network within the platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Account Security & Access Controls',
    description:
      'Authentication and access controls support the member experience. Always protect your sign-in details and verification codes.',
  },
  {
    icon: Bot,
    title: 'Practical Digital Tools',
    description:
      'Bring business-focused utilities, AI-assisted workflows, and community experiences together in one online workspace.',
  },
  {
    icon: Zap,
    title: 'A Platform That Keeps Evolving',
    description:
      'EAZY DON CHECK continues to develop as features are refined and improvements are introduced to better serve individuals and businesses.',
  },
];

function About() {
  return (
    <BackgroundSlider page="home" interval={7000} overlay="light">
      <div className="relative z-10 min-h-screen text-slate-900 dark:text-white">
        <Navbar />

        <main>
          <section className="relative overflow-hidden border-b border-white/20 bg-white/55 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/55">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
              <div className="mx-auto max-w-4xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-brand-700 shadow-sm dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">
                  <CheckCircle2 className="h-4 w-4" /> About the platform
                </span>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  About EAZY DON CHECK
                </h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-700 dark:text-slate-300 sm:text-lg">
                  EAZY DON CHECK is a multi-purpose online platform that brings practical digital tools and community features together. It is designed to help people work with receipt and invoice information, prepare business invoices, enhance photos, and connect through messaging and community conversations—all in one accessible workspace.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to="/invoice-generator"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
                  >
                    <FilePlus2 className="h-4 w-4" /> Create Invoice <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/70 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Back to Homepage
                  </Link>
                </div>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="flex h-full flex-col rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-base font-bold text-slate-950 dark:text-white">{feature.title}</h2>
                      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.description}</p>
                      {feature.link && (
                        <Link to={feature.link} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline dark:text-brand-400">
                          {feature.linkLabel} <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-10 grid gap-8 rounded-3xl border border-brand-200/60 bg-gradient-to-br from-white/90 to-brand-50/80 p-6 shadow-sm dark:border-brand-500/20 dark:from-slate-900/90 dark:to-slate-900/70 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left lg:flex-col lg:text-center">
                  <div className="h-44 w-44 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl ring-4 ring-brand-500/20 dark:border-slate-800 sm:h-40 sm:w-40 lg:h-52 lg:w-52">
                    <img
                      src="/EAZY-DON-CHECK-developer.jpg"
                      alt="Diyak Ezekiel Dalyop, Founder and Lead Developer of EAZY DON CHECK"
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-5 sm:mt-0 lg:mt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">The developer</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Diyak Ezekiel Dalyop</h2>
                    <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-400">Founder &amp; Lead Developer</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                      <Heart className="h-4 w-4" /> Built to bring useful tools together
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
                    EAZY DON CHECK is developed by Diyak Ezekiel Dalyop, who leads the platform’s development and ongoing improvement. The project brings together business-focused tools and community functionality in one online workspace, with the aim of making useful digital services easier to access from a single platform.
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    The platform continues to evolve as features are refined and new improvements are introduced. Its purpose is to make everyday digital tasks more convenient for individuals, professionals, and businesses while providing a place for people to connect and share knowledge.
                  </p>
                </div>
              </div>

              <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/70 bg-white/65 p-6 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60 sm:p-8">
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Our purpose and mission</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                  Our mission is to bring practical verification, invoicing, image tools, and digital community experiences together in one accessible platform. EAZY DON CHECK aims to help users save time, organize business tasks, make better-informed checks, and connect with others through a single online experience.
                </p>
                <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  AI-assisted extraction and analysis can make mistakes. Always review generated results and independently verify important financial information before making business or payment decisions.
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </BackgroundSlider>
  );
}

export default About;