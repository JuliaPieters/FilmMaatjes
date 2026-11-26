import { TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';
import { formatRating, formatStars, normalizeRating, ratingLabel } from '../../utils/rating';

describe('rating utils', () => {
  it('rounds to half stars within 0–5', () => {
    expect(normalizeRating(3.3)).toBe(3.5);
    expect(normalizeRating(3.2)).toBe(3);
    expect(normalizeRating(7)).toBe(5);
    expect(normalizeRating(-1)).toBe(0);
  });

  it('formats Dutch text', () => {
    expect(formatRating(3.5)).toBe('3,5');
    expect(formatStars(1)).toBe('1 ster');
    expect(formatStars(2.5)).toBe('2,5 sterren');
    expect(ratingLabel(4.5)).toBe('Geweldig');
  });
});

describe('StarRatingComponent', () => {
  function setup(value: number) {
    const fixture = TestBed.createComponent(StarRatingComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  function fills(el: HTMLElement): string[] {
    return [...el.querySelectorAll<HTMLElement>('.star-fill')].map(f => f.style.clipPath);
  }

  it('renders 3.5 as three full stars and one half star', () => {
    const fixture = setup(3.5);
    expect(fills(fixture.nativeElement)).toEqual([
      'inset(0)', 'inset(0)', 'inset(0)', 'inset(0 50% 0 0)', 'inset(0 100% 0 0)',
    ]);
  });

  it('picks a half star when clicking the left half', () => {
    const fixture = setup(0);
    const emitted: number[] = [];
    fixture.componentInstance.ratingChange.subscribe(v => emitted.push(v));

    const star = fixture.nativeElement.querySelectorAll('.star-btn')[2] as HTMLElement;
    star.getBoundingClientRect = () => ({ left: 100, width: 40 }) as DOMRect;
    star.dispatchEvent(new MouseEvent('click', { clientX: 110, detail: 1, bubbles: true }));
    star.dispatchEvent(new MouseEvent('click', { clientX: 130, detail: 1, bubbles: true }));

    expect(emitted).toEqual([2.5, 3]);
  });

  it('clears when tapping the current value again', () => {
    const fixture = setup(3);
    const star = fixture.nativeElement.querySelectorAll('.star-btn')[2] as HTMLElement;
    star.getBoundingClientRect = () => ({ left: 0, width: 40 }) as DOMRect;
    star.dispatchEvent(new MouseEvent('click', { clientX: 30, detail: 1, bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('steps by half stars with the arrow keys', () => {
    const fixture = setup(3);
    const group = fixture.nativeElement.querySelector('.stars') as HTMLElement;
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(fixture.componentInstance.value()).toBe(3.5);
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(fixture.componentInstance.value()).toBe(2.5);
  });
});
