import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '@/routes';

describe('NotFoundPage Integration', () => {
	it('renders NotFoundPage when navigating to an unknown route', () => {
		const router = createMemoryRouter(routes, {
			initialEntries: ['/unknown-path-xyz'],
		});

		render(<RouterProvider router={router} />);

		// Assert the NotFoundPage content is rendered
		expect(
			screen.getByRole('heading', {
				name: /this marketplace path is not live yet/i,
			})
		).toBeInTheDocument();

		// Assert the page title or heading contains a 404 or not found message
		expect(screen.getByText(/route not found/i)).toBeInTheDocument();
	});
});
