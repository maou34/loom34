
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  title: string;
  excerpt: string;
  date: string;
  image: string;
  category: string;
  slug: string;
  className?: string;
  featured?: boolean;
}

const ArticleCard = ({
  title,
  excerpt,
  date,
  image,
  category,
  slug,
  className,
  featured = false,
}: ArticleCardProps) => {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <article 
      className={cn(
        "group overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover-lift h-full flex flex-col",
        featured ? "md:grid md:grid-cols-2 md:gap-0" : "",
        className
      )}
    >
      <Link to={`/articles/${slug}`} className={cn("block overflow-hidden relative", featured ? "h-full order-1 md:order-none" : "aspect-video")}>
        <div className={cn("relative overflow-hidden w-full h-full", featured ? "min-h-[300px]" : "")}>
          <img
            src={image}
            alt={title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
          <span className="absolute top-4 left-4 bg-orange text-white text-xs font-medium px-3 py-1 rounded-full z-10 shadow-sm">
            {category}
          </span>
        </div>
      </Link>
      <div className={cn("p-6 flex flex-col flex-1", featured ? "justify-center md:p-8 lg:p-10" : "")}>
        <div className="flex items-center text-gray-500 text-sm mb-3">
          <Calendar size={16} className="mr-1" />
          <time dateTime={dateObj.toISOString()}>{formattedDate}</time>
        </div>
        <Link to={`/articles/${slug}`}>
          <h3 className={cn("font-bold mb-3 group-hover:text-brown transition-colors duration-200 leading-tight", featured ? "text-2xl md:text-3xl lg:text-4xl" : "text-xl")}>
            {title}
          </h3>
        </Link>
        <p className={cn("text-gray-600 mb-4 flex-1", featured ? "text-lg line-clamp-4" : "line-clamp-3")}>
          {excerpt}
        </p>
        <Link to={`/articles/${slug}`} className="text-brown font-medium flex items-center mt-auto group/link w-fit">
          Lire l'article
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 ml-1 transition-transform duration-300 group-hover/link:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
};

export default ArticleCard;
