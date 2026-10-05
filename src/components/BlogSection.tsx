import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Moon,
  Share2,
  X,
} from "lucide-react";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTime: string;
  category: string;
  paragraphs: string[];
  tips?: string[];
  image?: string;
  imageAlt?: string;
  sectionsTitle?: string;
  sections?: Array<{ title: string; body: string }>;
  finalThoughts?: string;
  source?: { label: string; url: string };
};

const BLOG_POSTS: BlogPost[] = [
  {
    slug: "magic-of-personalized-bedtime-stories",
    title: "The Magic of Personalized Bedtime Stories for Kids",
    excerpt:
      "Discover how making your child the hero of a bedtime story can support language, imagination, emotional growth, and family connection.",
    readingTime: "5 min read",
    category: "Personalized stories",
    image: "/blog/personalized-bedtime-stories.png",
    imageAlt:
      "A parent reading a magical personalized bedtime story to a child in a cozy bedroom",
    paragraphs: [
      "For parents of children ages 3 to 8, bedtime can be one of the most precious moments of the day. Adding a personal touch to that routine—through personalized bedtime stories featuring your child as the hero—can transform an ordinary night into a memorable experience. Beyond the fun, this simple practice offers real developmental benefits backed by educators and child psychologists alike.",
    ],
    sectionsTitle: "Why Bedtime Stories Matter",
    sections: [
      {
        title: "1. Builds Language and Vocabulary Skills",
        body: "Listening to stories exposes children to new words, sentence structures, and storytelling patterns, helping them develop stronger language skills early on.",
      },
      {
        title: "2. Strengthens the Parent-Child Bond",
        body: "Sharing a story together creates a quiet, focused moment of connection, reinforcing trust and emotional security between parent and child.",
      },
      {
        title: "3. Encourages Imagination and Creativity",
        body: "When children hear stories—especially ones where they are the main character—they begin picturing scenes, characters, and outcomes in their minds, nurturing creative thinking.",
      },
      {
        title: "4. Improves Focus and Listening Skills",
        body: "Following a narrative requires sustained attention, helping young children practice concentration in an engaging, low-pressure way.",
      },
      {
        title: "5. Supports Emotional Development",
        body: "Personalized stories can gently introduce themes like courage, kindness, or overcoming fears, helping children process emotions through relatable, familiar characters.",
      },
      {
        title: "6. Establishes a Calming Bedtime Routine",
        body: "A consistent story-time ritual signals that it is time to wind down, making it easier for children to transition smoothly into sleep.",
      },
    ],
    finalThoughts:
      "Personalized bedtime stories combine the timeless benefits of reading with the added joy of seeing your child as the star of their own adventure. It is a small nightly habit with a lasting impact—on language, emotional growth, and family connection.",
  },
  {
    slug: "personalized-audio-stories",
    title: "Why Children Enjoy Personalized Audio Stories",
    excerpt:
      "Names, favorite animals, and familiar interests can make an audio adventure feel especially inviting at bedtime.",
    readingTime: "4 min read",
    category: "Personalized audio",
    image: "/blog/personalized-audio-stories.png",
    imageAlt:
      "A child listening to a personalized audio story and imagining an adventure with a puppy",
    paragraphs: [
      "Imagine your child hearing, “Tonight, Lily and her little dog are going on an adventure.” Suddenly, the story feels familiar. Their name, their favorite animal, and something they love are part of the adventure.",
      "For children ages 3–8, these personal touches can make listening especially inviting. Here are four reasons personalized audio stories can become a much-loved part of bedtime.",
    ],
    sectionsTitle: "Why Children Enjoy Them",
    sections: [
      {
        title: "1. They Get to Be the Main Character",
        body: "Hearing their name gives children a personal connection to the story. An ordinary adventure can feel exciting when they imagine themselves helping a friend or discovering something new.",
      },
      {
        title: "2. Their Favorite Things Become Part of the Fun",
        body: "Whether your child loves dinosaurs, drawing, or puppies, familiar interests give them something to look forward to. The story begins with things they already enjoy.",
      },
      {
        title: "3. They Imagine the Story in Their Own Way",
        body: "Without on-screen pictures, children can picture the characters and places for themselves. A floating cloud might look like a rabbit to one child and a sailing boat to another.",
      },
      {
        title: "4. Familiar Details Bring a Sense of Comfort",
        body: "A favorite activity or recognizable family moment can make a story feel welcoming—especially as the day winds down.",
      },
    ],
    finalThoughts:
      "Every child has different tastes. Start with an age-appropriate story, keep the volume comfortable, and listen together when you can. Personalized audio stories offer a simple invitation: get cozy, listen, and imagine an adventure that feels like yours.",
  },
  {
    slug: "how-bedtime-stories-help-imaginations-grow",
    title: "How Bedtime Stories Help Little Imaginations Grow",
    excerpt:
      "See how bedtime stories can help children practice vocabulary, attention, memory, early learning, and creative problem-solving.",
    readingTime: "4 min read",
    category: "Learning & imagination",
    image: "/blog/little-imaginations-grow.png",
    imageAlt:
      "A child imagining a friendly dragon, castle, sailing ship, and rocket at bedtime",
    paragraphs: [
      "When your child listens to a story, words can become pictures in their mind: a cozy treehouse, a playful puppy, or a garden full of butterflies. For children ages 3–8, this imaginative experience offers opportunities to practice skills they use in everyday learning.",
      "The American Academy of Pediatrics highlights how shared reading supports language, relationships, and social-emotional development. Listening together and talking about stories can bring these learning opportunities into your bedtime routine. Here are four ways bedtime stories can support your child's growing mind:",
    ],
    sectionsTitle: "How Stories Support Growing Minds",
    sections: [
      {
        title: "1. Building Vocabulary",
        body: "Hearing words within a story gives them context. Imagining a character “tiptoeing” helps children connect an unfamiliar word with a familiar action.",
      },
      {
        title: "2. Practicing Attention and Memory",
        body: "Following a short adventure invites children to remember characters and events—skills they also use when listening to classroom instructions.",
      },
      {
        title: "3. Making Learning Easier to Picture",
        body: "A story about sharing six strawberries between two friends can make counting and early math concrete. Imagining a seed becoming a flower can introduce simple science ideas.",
      },
      {
        title: "4. Encouraging Problem-Solving",
        body: "Wondering how a character will carry toys across a puddle gives children a chance to imagine solutions and consider what might happen next.",
      },
    ],
    finalThoughts:
      "Personalized bedtime stories can make these moments feel especially inviting by including your child's name and interests. Listen together when possible, welcome questions, and keep bedtime relaxed. A familiar voice and an engaging story can turn a quiet evening into a meaningful moment of connection and discovery.",
    source: {
      label: "American Academy of Pediatrics policy statement on shared reading",
      url: "https://publications.aap.org/pediatrics/article/154/6/e2024069090/199467/Literacy-Promotion-An-Essential-Component-of",
    },
  },
];

const DEFAULT_DESCRIPTION =
  "Personalized, screen-free bedtime audio stories for children ages 3-8, created around their favorite themes, hobbies, and animals and sent to parents by email.";

const getPostSlugFromPath = () => {
  const match = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
  return match && BLOG_POSTS.some((post) => post.slug === match[1])
    ? match[1]
    : null;
};

export default function BlogSection() {
  const [openPost, setOpenPost] = useState<string | null>(getPostSlugFromPath);
  const [copied, setCopied] = useState(false);
  const selectedPost = BLOG_POSTS.find((post) => post.slug === openPost);

  useEffect(() => {
    const syncPostWithUrl = () => setOpenPost(getPostSlugFromPath());
    window.addEventListener("popstate", syncPostWithUrl);
    return () => window.removeEventListener("popstate", syncPostWithUrl);
  }, []);

  useEffect(() => {
    if (!selectedPost) {
      document.title =
        "Personalized Bedtime Audio Stories for Kids | Cozy Kid Tales";
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", DEFAULT_DESCRIPTION);
      return;
    }

    document.title = `${selectedPost.title} | Cozy Kid Tales`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", selectedPost.excerpt);
    requestAnimationFrame(() => {
      document.getElementById("blog")?.scrollIntoView({ behavior: "smooth" });
    });
  }, [selectedPost]);

  const openArticle = (slug: string) => {
    window.history.pushState({}, "", `/blog/${slug}`);
    setCopied(false);
    setOpenPost(slug);
  };

  const closeArticle = () => {
    window.history.pushState({}, "", "/#blog");
    setCopied(false);
    setOpenPost(null);
  };

  const shareArticle = async (post: BlogPost) => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.excerpt, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="blog"
      data-scroll-reveal
      className="scroll-reveal reveal-from-right relative mx-auto max-w-5xl border-t border-[#1d265a] bg-transparent px-4 py-14 sm:px-6 sm:py-20 md:px-12"
    >
      <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#828bbd]">
          Cozy Notes for Parents
        </span>
        <h2 className="font-kids text-3xl tracking-wide text-white sm:text-5xl">
          The Bedtime Blog
        </h2>
        <p className="text-sm font-light leading-relaxed text-slate-400">
          Simple ideas for calmer evenings, imaginative listening, and
          screen-free family routines.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {BLOG_POSTS.map((post) => {
          const isOpen = post.slug === openPost;
          return (
            <article
              key={post.slug}
              className={`flex flex-col rounded-3xl border p-5 text-left shadow-lg transition-colors sm:p-6 ${
                isOpen
                  ? "border-amber-300/60 bg-[#111944]"
                  : "border-[#26306a] bg-[#0b1238] hover:border-indigo-300/50"
              }`}
            >
              {post.image ? (
                <img
                  src={post.image}
                  alt={post.imageAlt || ""}
                  className="mb-5 aspect-[16/10] w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                {post.category}
              </span>
              <h3 className="mt-3 text-xl font-bold leading-snug text-white">
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-slate-300">
                {post.excerpt}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-indigo-950/60 pt-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.readingTime}
                </span>
                <button
                  type="button"
                  onClick={() => (isOpen ? closeArticle() : openArticle(post.slug))}
                  aria-expanded={isOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {isOpen ? "Close" : "Read article"}
                  {isOpen ? (
                    <X className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selectedPost && (
        <article className="mt-6 rounded-3xl border border-amber-300/30 bg-gradient-to-br from-[#111944] to-[#080d2b] p-5 text-left shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-5 border-b border-indigo-300/15 pb-5">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                {selectedPost.category} · {selectedPost.readingTime}
              </span>
              <h3 className="mt-2 font-kids text-2xl tracking-wide text-white sm:text-3xl">
                {selectedPost.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeArticle}
              aria-label="Close article"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-amber-300/60 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-sm font-light leading-7 text-slate-300 sm:text-base">
            {selectedPost.image && (
              <img
                src={selectedPost.image}
                alt={selectedPost.imageAlt || ""}
                className="mb-7 aspect-[16/9] w-full rounded-2xl border border-indigo-300/20 object-cover shadow-xl"
              />
            )}
            {selectedPost.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {selectedPost.source && (
              <p className="text-xs text-slate-400">
                Source:{" "}
                <a
                  href={selectedPost.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-300 underline decoration-indigo-300/40 underline-offset-4 hover:text-indigo-200"
                >
                  {selectedPost.source.label}
                </a>
              </p>
            )}
            {selectedPost.sections && (
              <div className="space-y-5 pt-3">
                <h4 className="font-kids text-2xl tracking-wide text-amber-200">
                  {selectedPost.sectionsTitle}
                </h4>
                {selectedPost.sections.map((section) => (
                  <section key={section.title} className="space-y-1.5">
                    <h5 className="font-bold text-white">{section.title}</h5>
                    <p>{section.body}</p>
                  </section>
                ))}
              </div>
            )}
            {selectedPost.finalThoughts && (
              <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
                <h4 className="font-bold text-amber-200">Final Thoughts</h4>
                <p className="mt-2">{selectedPost.finalThoughts}</p>
              </div>
            )}
            {selectedPost.tips && selectedPost.tips.length > 0 && (
              <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-5">
                <h4 className="flex items-center gap-2 font-bold text-emerald-200">
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  Try these tonight
                </h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {selectedPost.tips.map((tip) => (
                    <li key={tip} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => void shareArticle(selectedPost)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 py-2.5 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Link copied" : "Share article"}
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
