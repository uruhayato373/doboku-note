import { FaInstagram, FaGithub } from 'react-icons/fa';

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const NoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 493 493" width="24" height="24">
    <path
      d="m139.57,142.06c41.19,0,97.6-2.09,138.1-1.04,54.34,1.39,74.76,25.06,75.45,83.53.69,33.06,0,127.73,0,127.73h-58.79c0-82.83.35-96.5,0-122.6-.69-22.97-7.25-33.92-24.9-36.01-18.69-2.09-71.07-.35-71.07-.35v158.96h-58.79v-210.22Z"
      fill="currentColor"
    />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-primary-darkest text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo / Copyright */}
          <div>
            <p className="text-sm text-gray-300">
              Copyright © {new Date().getFullYear()} doboku-note
            </p>
          </div>

          {/* Links placeholder */}
          <div />

          {/* Social Links */}
          <div>
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-semibold mr-2">Follow Me</h4>
              <a
                href="https://x.com/uruhayato373"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <XIcon />
              </a>
              <a
                href="https://www.instagram.com/uruhayato373"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <FaInstagram size={24} />
              </a>
              <a
                href="https://github.com/uruhayato373"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <FaGithub size={24} />
              </a>
              <a
                href="https://note.com/uruhayato373"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Note"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <NoteIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
