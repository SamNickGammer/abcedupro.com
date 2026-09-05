/** Contact details and navigation shared by the public pages and the footer. */

export const SITE = {
  name: "Institute of ABC",
  tagline: "Association of Being Civilization",
  blurb:
    "Bihar's trusted institute for professional computer education. Building careers since 2016.",
  phone: "+91 99733 80780",
  phoneHref: "tel:+919973380780",
  email: "abc.ask2@gmail.com",
  emailHref: "mailto:abc.ask2@gmail.com",
  location: "Haspura, Bihar",
  registeredOffice: "Institute of ABC, Registered Office: Haspura, Aurangabad, 824120",
  corporateOffice: "Corporate Office: Gaya Paharpur (Near 5 No. Gate)",
  societyReg: "Under Society Reg. Act No. 739/2015-16, 211860",
  iso: "An ISO 9001:2015 Certified Company",
  director: "Mr. Sanjay Kumar Rakesh",
  foundedYear: 2016,
} as const;

export const SOCIALS = [
  { name: "YouTube", icon: "/assets/icons/youtube.svg", href: "#" },
  { name: "Instagram", icon: "/assets/icons/instagram.svg", href: "#" },
  { name: "Facebook", icon: "/assets/icons/facebook.svg", href: "#" },
  { name: "Twitter", icon: "/assets/icons/twitter.svg", href: "#" },
] as const;

export const NAV_LEFT = [
  { label: "Home", href: "/" },
  {
    label: "About Us",
    href: "/about",
    children: [
      { label: "Director's Message", href: "/about" },
      { label: "ISO Certificate", href: "/about?tab=iso" },
      { label: "Bihar Govt. Certificate", href: "/about?tab=govt" },
    ],
  },
  { label: "Courses", href: "/course" },
  { label: "Gallery", href: "/gallery" },
] as const;

export const NAV_RIGHT = [
  { label: "Student Verification", href: "/student_info" },
  { label: "Contact", href: "/contact" },
] as const;

export const CERTIFIED_BY = [
  { src: "/assets/images/certified/iso-certified.png", alt: "ISO 9001:2015 Certified" },
  { src: "/assets/images/certified/BiharGovernment.png", alt: "Government of Bihar" },
  { src: "/assets/images/certified/png-clipart.png", alt: "Certification body" },
  { src: "/assets/images/certified/png-clipart-skill.png", alt: "Skill India" },
  { src: "/assets/images/certified/hep.png", alt: "HEP" },
  { src: "/assets/images/certified/microsoft.png", alt: "Microsoft" },
] as const;
