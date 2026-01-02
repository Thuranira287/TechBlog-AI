import React from "react";

/**
 * AuthorBio Component
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.compact - If true, renders a shorter version of the bio
 * @param {boolean} props.showAvatar - If true, displays the author's avatar
 * @param {boolean} props.showSocialLinks - If true, displays social media links
 * @param {boolean} props.showContact - If true, displays contact information
 */
export default function AuthorBio({ 
  compact = true, 
  showAvatar = true, 
  showSocialLinks = true,
  showContact = true 
}) {
  const author = {
    name: "Alexander Zachary",
    title: "Senior AI & Full-Stack Developer",
    role: "Founder & Lead Author",
    location: "Nairobi, Kenya",
    email: "contact@techblogai.com",
    avatar: "/images/author-avatar.jpg",
    shortBio: "Alexander Zachary is a Computer Science professional specializing in AI development, web technologies, and creating practical learning resources for developers.",
    longBio: `Alexander Zachary is a Computer Science graduate with over 5 years of professional experience in full-stack development and artificial intelligence. 
    As the founder of TechBlog AI, he combines technical expertise with pedagogical clarity to create practical, accessible learning resources.
    
    His work focuses on bridging the gap between complex technical concepts and real-world implementation, with particular emphasis on 
    supporting developers and students in emerging tech ecosystems. Alexander holds certifications in AWS Cloud Architecture, React 
    development, and Machine Learning fundamentals, and regularly contributes to open-source projects in the AI and web development space.
    
    He believes in the democratization of technical education and is passionate about creating content that empowers developers 
    across all experience levels to build meaningful projects and advance their careers.`
  };

  const socialLinks = [
    {
      platform: "GitHub",
      url: "https://github.com/Thuranira287",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    },
    {
      platform: "LinkedIn",
      url: "https://www.linkedin.com/in/alexander-zachary-287b621b4/",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    {
      platform: "Twitter",
      url: "https://x.com/ranviah?s=09",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      )
    }
  ];

  return (
    <div className={`${compact ? 'p-4' : 'p-8'} bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300`}>
      <div className="flex flex-col md:flex-row gap-6">
        {showAvatar && (
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={author.avatar}
                alt={`${author.name} - ${author.title}`}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=3B82F6&color=fff&size=256`;
                }}
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {author.role}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">{author.name}</h3>
              <p className="text-sm md:text-base text-blue-600 font-medium mt-1">{author.title}</p>
            </div>
            <div className="mt-2 md:mt-0">
              <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                {author.location}
              </span>
            </div>
          </div>

          <div className={`prose prose-blue max-w-none ${compact ? 'prose-sm' : 'prose-base'}`}>
            <p className="text-gray-700 leading-relaxed">
              {compact ? author.shortBio : author.longBio}
            </p>
          </div>

          {showContact && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <a 
                  href={`mailto:${author.email}`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  {author.email}
                </a>
                <span className="hidden sm:inline text-gray-300">•</span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Response time: 24-48 hours
                </div>
              </div>
            </div>
          )}

          {showSocialLinks && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Connect with me:</p>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md"
                    aria-label={`Visit ${author.name}'s ${link.platform} profile`}
                  >
                    <span className="flex-shrink-0 text-gray-600">
                      {link.icon}
                    </span>
                    {link.platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!compact && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Expertise Areas</h4>
              <div className="flex flex-wrap gap-2">
                {['Artificial Intelligence', 'React & Next.js', 'Cloud Architecture', 'Cybersecurity Fundamentals', 'Technical Writing', 'API Development'].map((skill) => (
                  <span 
                    key={skill}
                    className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}