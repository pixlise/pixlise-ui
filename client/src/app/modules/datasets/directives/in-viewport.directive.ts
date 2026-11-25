import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input, output } from '@angular/core';

@Directive({
  selector: '[visibleInViewport]',
  standalone: true
})
export class InViewportDirective implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private observer?: IntersectionObserver;

  // Optional: 0 = triggers as soon as 1px is visible, 1 = 100% visible
  threshold = input<number>(0.1); 
  
  // Emits true when entering viewport, false when leaving
  visibleInViewport = output<boolean>();

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.visibleInViewport.emit(entry.isIntersecting);

          // Don't notify after we've found it was visible
          if (entry.isIntersecting) {
            this.observer?.disconnect();
          }
        });
      },
      { threshold: this.threshold() }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
