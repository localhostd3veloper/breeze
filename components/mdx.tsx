import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Banner } from 'fumadocs-ui/components/banner';
import { Callout } from 'fumadocs-ui/components/callout';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  Activity,
  Boxes,
  Brain,
  Globe,
  ImageIcon,
  LineChart,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { MDXComponents } from 'mdx/types';

/**
 * Components every docs page can use without importing anything.
 *
 * `defaultMdxComponents` already covers `Card`/`Cards`, `Callout`, headings,
 * links, images, tables and code blocks. The rest are opt-in in Fumadocs, so
 * they have to be registered here or MDX referencing them fails to render.
 *
 * The lucide icons are here so a `<Card icon={<Rocket />} />` in MDX resolves
 * without a per-page import.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Banner,
    Callout,
    File,
    Files,
    Folder,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    Activity,
    Boxes,
    Brain,
    Globe,
    ImageIcon,
    LineChart,
    Rocket,
    Search,
    Server,
    Shield,
    Sparkles,
    Terminal,
    ...components,
  };
}
