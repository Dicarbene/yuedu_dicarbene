<template>
  <article class="book-card-skeleton glass-panel" aria-hidden="true">
    <div class="skeleton-cover"></div>
    <div class="skeleton-copy">
      <div class="skeleton-row title"></div>
      <div class="skeleton-row author"></div>
      <div class="skeleton-row meta"></div>
      <div class="skeleton-row brief"></div>
      <div class="skeleton-row brief short"></div>
      <div class="skeleton-actions">
        <span></span>
        <span></span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.book-card-skeleton {
  display: grid;
  grid-template-columns: 122px minmax(0, 1fr);
  gap: 22px;
  min-height: 286px;
  padding: 20px;
  border-radius: 8px;
  overflow: hidden;
  content-visibility: auto;
  contain-intrinsic-size: 286px;
}

.skeleton-cover,
.skeleton-row,
.skeleton-actions span {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(31, 56, 52, 0.08);
}

.skeleton-cover::after,
.skeleton-row::after,
.skeleton-actions span::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 253, 0.62),
    transparent
  );
  animation: skeleton-sheen 1.25s ease-in-out infinite;
}

.skeleton-cover {
  aspect-ratio: 3 / 4;
  background:
    linear-gradient(165deg, rgba(218, 232, 227, 0.78), rgba(191, 210, 212, 0.72));
}

.skeleton-copy {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto auto;
  gap: 14px;
}

.skeleton-row {
  height: 12px;
}

.skeleton-row.title {
  width: min(72%, 260px);
  height: 22px;
}

.skeleton-row.author {
  width: 38%;
}

.skeleton-row.meta {
  width: 100%;
  height: 26px;
  margin-top: 6px;
}

.skeleton-row.brief {
  width: 94%;
}

.skeleton-row.short {
  width: 64%;
}

.skeleton-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.skeleton-actions span {
  width: 92px;
  height: 34px;
}

@keyframes skeleton-sheen {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-cover::after,
  .skeleton-row::after,
  .skeleton-actions span::after {
    animation: none;
  }
}

@media (max-width: 720px) {
  .book-card-skeleton {
    grid-template-columns: 96px minmax(0, 1fr);
    min-height: 232px;
    padding: 16px;
    gap: 16px;
    contain-intrinsic-size: 232px;
  }
}
</style>
