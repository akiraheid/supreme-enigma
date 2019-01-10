import { Selector } from 'testcafe'

exports.testBasePageFormat = () => {
	// eslint-disable-next-line no-undef
	test('menu displays correct links', async t => {
		const menu = Selector('#menu')

		// Check for banner
		await t.expect(menu.exists).ok()

		// Check links
		const links = menu.find('a')
		await t.expect(links.count).eql(3)

		await t.expect(links.nth(0).textContent).eql('Home')
		await t.expect(links.nth(0).withAttribute('href', '/')).ok()

		await t.expect(links.nth(1).textContent).eql('Projects')
		await t.expect(links.nth(1).withAttribute('href', '/projects')).ok()

		await t.expect(links.nth(2).textContent).eql('Ideas')
		await t.expect(links.nth(2).withAttribute('href', '/ideas')).ok()
	})

	// eslint-disable-next-line no-undef
	test('footer displays correct links', async t => {
		const footer = Selector('#footer')

		// Check for footer
		await t.expect(footer.exists).ok()

		const links = footer.find('a')
		await t.expect(links.count).eql(1)
		await t.expect(links.nth(0).withAttribute('href', 'https://github.com/akiraheid')).ok()
	})
}
