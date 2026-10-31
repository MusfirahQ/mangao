import { Link } from 'react-router-dom';
import { rs, ratingText, ratingCount, etaText } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';
import { ImgTile, VendorLogo } from './Common.jsx';
import { FavButton } from './ProductParts.jsx';

export default function StoreCard({ vendor: v }) {
  const { mode } = useCart();
  const badge = !v.isOpen ? 'Closed now' : v.deliveryFee === 0 ? 'Free delivery' : v.featured ? 'Popular' : '';
  let fee;
  if (mode === 'pickup') fee = <span className="free-tag"><i className="bi bi-bag-check" aria-hidden="true" />No delivery fee</span>;
  else if (v.deliveryFee === 0) fee = <span className="free-tag"><i className="bi bi-bicycle" aria-hidden="true" />Free delivery</span>;
  else fee = <span><i className="bi bi-bicycle" aria-hidden="true" />{rs(v.deliveryFee)}{v.freeDeliveryOver ? `, free over ${rs(v.freeDeliveryOver)}` : ''}</span>;
  return (
    <article className={`vendor-card ${v.isOpen ? '' : 'is-closed'}`}>
      <Link className="vendor-link" to={`/store/${v.id}`} aria-label={`${v.name}${v.isOpen ? '' : ', closed now'}, rated ${ratingText(v)}, ${etaText(v, mode)}`} />
      {badge && <span className="deal-badge">{badge}</span>}
      <FavButton kind="vendors" id={v.id} name={v.name} />
      <ImgTile image={v.cover} cat={v.type === 'shop' ? 'shop' : 'food'} />
      <div className="vendor-body">
        <VendorLogo vendor={v} />
        <h3 className="vendor-name">
          <span>{v.name}</span>
          <span className="vendor-rating"><i className="bi bi-star-fill" aria-hidden="true" /> {ratingText(v)} {v.ratings > 0 && <small>({ratingCount(v.ratings)})</small>}</span>
        </h3>
        <p className="vendor-tags mb-2">{(v.tags || []).join(', ')} · {v.area}</p>
        <div className="vendor-meta"><span><i className="bi bi-clock" aria-hidden="true" />{etaText(v, mode)}</span>{fee}</div>
        {v.isDemo && <p className="demo-tag"><i className="bi bi-info-circle" aria-hidden="true" />Demo listing · not affiliated</p>}
      </div>
    </article>
  );
}
