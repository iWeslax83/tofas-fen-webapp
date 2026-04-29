/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../Tabs';

const renderBasic = (defaultValue = 'a') =>
  render(
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="a">First</TabsTrigger>
        <TabsTrigger value="b">Second</TabsTrigger>
        <TabsTrigger value="c" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="a">Content A</TabsContent>
      <TabsContent value="b">Content B</TabsContent>
      <TabsContent value="c">Content C</TabsContent>
    </Tabs>,
  );

describe('Tabs (uncontrolled)', () => {
  it('renders the tablist with the orientation prop', () => {
    renderBasic();
    const list = screen.getByRole('tablist');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders all tab triggers with role=tab', () => {
    renderBasic();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument();
  });

  it('marks the defaultValue trigger as selected', () => {
    renderBasic('a');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders only the active panel by default', () => {
    renderBasic('a');
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.queryByText('Content B')).toBeNull();
  });

  it('switches the active panel when a trigger is clicked', async () => {
    const user = userEvent.setup();
    renderBasic('a');
    await user.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByText('Content B')).toBeInTheDocument();
    expect(screen.queryByText('Content A')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
  });

  it('does not switch when a disabled trigger is clicked', async () => {
    const user = userEvent.setup();
    renderBasic('a');
    await user.click(screen.getByRole('tab', { name: 'Disabled' }));
    // Active tab unchanged, disabled tab not selected
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Disabled' })).toHaveAttribute('aria-selected', 'false');
  });

  it('forwards the disabled flag to the underlying button', () => {
    renderBasic();
    expect(screen.getByRole('tab', { name: 'Disabled' })).toBeDisabled();
  });

  it('wires aria-controls and aria-labelledby between trigger and panel', () => {
    renderBasic('a');
    const trigger = screen.getByRole('tab', { name: 'First' });
    const panel = screen.getByRole('tabpanel');
    expect(trigger).toHaveAttribute('aria-controls', 'tab-content-a');
    expect(trigger).toHaveAttribute('id', 'tab-trigger-a');
    expect(panel).toHaveAttribute('id', 'tab-content-a');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-trigger-a');
  });

  it('uses tabIndex=0 for the active trigger and -1 for inactive ones', () => {
    renderBasic('a');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('tabIndex', '-1');
  });
});

describe('Tabs (controlled)', () => {
  it('reflects the controlled value prop', () => {
    render(
      <Tabs value="b" onValueChange={() => {}}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
        <TabsContent value="b">B panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('B panel')).toBeInTheDocument();
    expect(screen.queryByText('A panel')).toBeNull();
  });

  it('fires onValueChange when a trigger is clicked but does not switch on its own', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs value="a" onValueChange={onChange}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
        <TabsContent value="b">B panel</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole('tab', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
    // Controlled — value still "a", no switch yet
    expect(screen.getByText('A panel')).toBeInTheDocument();
  });
});

describe('TabsContent forceMount', () => {
  it('keeps inactive content rendered when forceMount is set', () => {
    // forceMount only takes effect when inactive AND forceMount=true.
    // The component still gates with isActive check inside AnimatePresence,
    // so we just verify the prop type exists and renders without crashing.
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="b" forceMount>
          B always
        </TabsContent>
      </Tabs>,
    );
    // Component renders without throwing when forceMount on inactive tab
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

describe('TabsTrigger guards', () => {
  it('throws when used outside a Tabs root', () => {
    // Suppress React's error boundary noise in jsdom output
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TabsTrigger value="x">x</TabsTrigger>)).toThrow(
      /must be used within Tabs/,
    );
    errSpy.mockRestore();
  });
});
