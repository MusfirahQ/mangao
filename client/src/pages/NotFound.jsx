import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Common.jsx';
import useTitle from '../lib/useTitle.js';

export default function NotFound() {
  useTitle('Page not found — Mangao');
  return (
    <section className="container-xl page-pad" aria-labelledby="nfTitle">
      <EmptyState mood="sad" title="We couldn't find that page" text="The link may be old, or the page has moved.">
        <Link to="/" className="btn btn-mango">Go to home</Link>
      </EmptyState>
    </section>
  );
}
