import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Info, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EventCardProps {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  slug: string;
  registrationUrl?: string;
  className?: string;
  featured?: boolean;
}

const EventCard = ({
  title,
  description,
  date,
  time,
  location,
  image,
  slug,
  registrationUrl,
  className,
  featured = false,
}: EventCardProps) => {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <article 
      className={cn(
        "group overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover-lift h-full flex flex-col",
        featured ? "md:grid md:grid-cols-2 md:gap-0" : "",
        className
      )}
    >
      <Link to={`/events/${slug}`} className={cn("block overflow-hidden relative", featured ? "h-full order-1 md:order-none" : "aspect-video")}>
        <div className={cn("relative overflow-hidden w-full h-full", featured ? "min-h-[300px]" : "")}>
          <img
            src={image}
            alt={`Image de l'événement : ${title}`}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Calendar size={12} className="text-orange" />
            <span className="capitalize">{formattedDate}</span>
          </div>
        </div>
      </Link>
      
      <div className={cn("p-6 flex flex-col flex-1", featured ? "justify-center md:p-8 lg:p-10" : "")}>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock size={16} className="mr-2 text-orange flex-shrink-0" />
            <span>{time}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-2 text-orange flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        <Link to={`/events/${slug}`}>
          <h3 className={cn("font-bold mb-3 group-hover:text-brown transition-colors duration-200 leading-tight", featured ? "text-2xl md:text-3xl lg:text-4xl" : "text-xl")}>
            {title}
          </h3>
        </Link>
        
        <p className={cn("text-gray-600 mb-6 flex-1", featured ? "text-lg line-clamp-4" : "line-clamp-3")}>
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-orange/10 hover:text-orange hover:border-orange/30 transition-colors"
            asChild
          >
            <Link to={`/events/${slug}`} aria-label={`Voir les détails de l'événement : ${title}`}>
              <Info className="w-4 h-4 mr-2" />
              Plus d'infos
            </Link>
          </Button>
          {registrationUrl && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-brown hover:bg-brown-light text-white"
              asChild
            >
              <Link
                to={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`S'inscrire à l'événement : ${title}`}
              >
                <Ticket className="w-4 h-4 mr-2" />
                S'inscrire
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default EventCard;
