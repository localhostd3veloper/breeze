'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  MoreHorizontalIcon,
  PinIcon,
  ArchiveIcon,
  ShareIcon,
  Trash2Icon,
} from 'lucide-react';

function useConversations() {
  const isLoading = false;
  const conversations = [
    {
      name: 'Refactoring chat UI to Server Components',
      id: 'usr_chat_r9f8h23jf8',
    },
    {
      name: 'Best practices for Next.js App Router',
      id: 'usr_chat_nextjs_bp01',
    },
    {
      name: 'How to implement Radix UI Tooltips securely',
      id: 'usr_chat_radix_tltp22',
    },
    {
      name: 'Python script for automating data entry',
      id: 'usr_chat_py_auto99',
    },
    {
      name: 'Discussing the ending of Interstellar',
      id: 'usr_chat_movie_instlr',
    },
    {
      name: 'Top 10 travel destinations for 2026',
      id: 'usr_chat_trvl_2026',
    },
    {
      name: 'Explain Quantum Computing to a 5-year old',
      id: 'usr_chat_qcomp_eli5',
    },
    {
      name: 'Rust vs Go for concurrent microservices',
      id: 'usr_chat_rst_go_cmp',
    },
    {
      name: 'Generating a weekly meal plan (1800 kcal)',
      id: 'usr_chat_meal_pln18',
    },
    {
      name: 'Understanding React Server Actions deeply',
      id: 'usr_chat_rsa_deepdv',
    },
    {
      name: 'Fixing the annoying hydration mismatch bugs',
      id: 'usr_chat_react_hyd_fx',
    },
    {
      name: 'PostgreSQL JSONB querying techniques',
      id: 'usr_chat_pg_jsonb_qry',
    },
    {
      name: 'Creative writing: A sci-fi short story',
      id: 'usr_chat_scifi_story4',
    },
    {
      name: 'What does "Skibidi Toilet" mean? Pls explain',
      id: 'usr_chat_genz_slangq',
    },
    {
      name: 'Setting up a local LLM with Ollama',
      id: 'usr_chat_lcl_llm_setup',
    },
    {
      name: 'How to start a SaaS business in 30 days',
      id: 'usr_chat_saas_30dy',
    },
    {
      name: 'Design review for the new analytics dashboard',
      id: 'usr_chat_dsgn_dash99',
    },
    {
      name: 'Deno vs Node.js: What should I pick?',
      id: 'usr_chat_deno_v_node',
    },
    {
      name: 'Drafting an email to my angry landlord',
      id: 'usr_chat_email_lndlrd',
    },
    {
      name: 'Translate this Japanese text to English',
      id: 'usr_chat_jp_en_trans',
    },
    {
      name: 'Why do cats purr?',
      id: 'usr_chat_cats_purr',
    },
    {
      name: 'Learning piano as an adult beginner',
      id: 'usr_chat_piano_bgnr',
    },
    {
      name: 'Analyzing market trends for tech stocks',
      id: 'usr_chat_tk_stcks',
    },
    {
      name: 'Writing a cover letter for a Senior Dev role',
      id: 'usr_chat_cvlr_sndev',
    },
    {
      name: 'Creating a custom color palette in Tailwind v4',
      id: 'usr_chat_tw4_clrs',
    },
    {
      name: 'How to negotiate a salary offer effectively',
      id: 'usr_chat_slry_ngot',
    },
    {
      name: 'Debugging memory leaks in a React Native app',
      id: 'usr_chat_rn_ml_dbg',
    },
    {
      name: 'Summarize the history of Ancient Rome',
      id: 'usr_chat_rome_hist',
    },
    {
      name: 'Brainstorming YouTube video ideas for tech channel',
      id: 'usr_chat_yt_ideas4',
    },
    {
      name: 'Best build path for Jinx in League of Legends',
      id: 'usr_chat_lol_jinx4',
    },
  ];
  return {
    isLoading,
    conversations,
  };
}

export function NavConversations() {
  const { isMobile } = useSidebar();

  const { conversations, isLoading } = useConversations();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Conversations</SidebarGroupLabel>
      <SidebarMenu>
        {conversations.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.id}>
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="aria-expanded:bg-muted"
                >
                  <MoreHorizontalIcon />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <PinIcon className="text-muted-foreground" />
                  <span>Pin</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ArchiveIcon className="text-muted-foreground" />
                  <span>Archive</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ShareIcon className="text-muted-foreground" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2Icon className="text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontalIcon className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
