/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid, GridItem } from '../Grid';

describe('Grid', () => {
  it('renders children inside a flex/grid wrapper', () => {
    render(
      <Grid>
        <span data-testid="child">A</span>
      </Grid>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies grid + cols class for a single numeric cols prop', () => {
    const { container } = render(<Grid cols={6}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-6');
  });

  it('defaults to 12 columns when cols is omitted', () => {
    const { container } = render(<Grid>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-cols-12');
  });

  it('applies responsive cols-* classes when cols is an object', () => {
    const { container } = render(<Grid cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-cols-sm-1');
    expect(root.className).toContain('grid-cols-md-2');
    expect(root.className).toContain('grid-cols-lg-3');
    expect(root.className).toContain('grid-cols-xl-4');
  });

  it('only includes the breakpoints actually provided', () => {
    const { container } = render(<Grid cols={{ md: 2 }}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-cols-md-2');
    expect(root.className).not.toContain('grid-cols-sm-');
    expect(root.className).not.toContain('grid-cols-lg-');
  });

  it('translates a numeric gap into a CSS var token', () => {
    const { container } = render(<Grid gap={4}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toBe('var(--space-4)');
  });

  it('passes a string gap straight through', () => {
    const { container } = render(<Grid gap="2rem">x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toBe('2rem');
  });

  it('appends user-provided className', () => {
    const { container } = render(<Grid className="extra-token">x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('extra-token');
  });
});

describe('GridItem', () => {
  it('renders children inside a grid-item div', () => {
    render(
      <GridItem>
        <span data-testid="c">A</span>
      </GridItem>,
    );
    expect(screen.getByTestId('c')).toBeInTheDocument();
  });

  it('omits the col-span class when colSpan is unset', () => {
    const { container } = render(<GridItem>x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-item');
    expect(root.className).not.toContain('grid-col-span-');
  });

  it('emits a single grid-col-span-N class for a numeric colSpan', () => {
    const { container } = render(<GridItem colSpan={3}>x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-col-span-3');
  });

  it('emits responsive grid-col-span-{breakpoint}-N classes when colSpan is an object', () => {
    const { container } = render(<GridItem colSpan={{ sm: 2, lg: 4 }}>x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('grid-col-span-sm-2');
    expect(root.className).toContain('grid-col-span-lg-4');
    expect(root.className).not.toContain('grid-col-span-md-');
    expect(root.className).not.toContain('grid-col-span-xl-');
  });

  it('writes gridRow inline style when rowSpan is set', () => {
    const { container } = render(<GridItem rowSpan={2}>x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gridRow).toBe('span 2');
  });

  it('does not write gridRow when rowSpan is omitted', () => {
    const { container } = render(<GridItem>x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gridRow).toBe('');
  });

  it('appends user-provided className', () => {
    const { container } = render(<GridItem className="extra-token">x</GridItem>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('extra-token');
  });
});
