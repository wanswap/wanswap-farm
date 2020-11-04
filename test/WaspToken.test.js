const { expectRevert } = require('@openzeppelin/test-helpers');
const WaspToken = artifacts.require('WaspToken');

contract('WaspToken', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.wasp = await WaspToken.new({ from: alice });
    });

    it('should have correct name and symbol and decimal', async () => {
        const name = await this.wasp.name();
        const symbol = await this.wasp.symbol();
        const decimals = await this.wasp.decimals();
        assert.equal(name.valueOf(), 'WaspToken');
        assert.equal(symbol.valueOf(), 'WASP');
        assert.equal(decimals.valueOf(), '18');
    });

    it('should only allow owner to mint token', async () => {
        await this.wasp.mint(alice, '100', { from: alice });
        await this.wasp.mint(bob, '1000', { from: alice });
        await expectRevert(
            this.wasp.mint(carol, '1000', { from: bob }),
            'Ownable: caller is not the owner',
        );
        const totalSupply = await this.wasp.totalSupply();
        const aliceBal = await this.wasp.balanceOf(alice);
        const bobBal = await this.wasp.balanceOf(bob);
        const carolBal = await this.wasp.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '100');
        assert.equal(bobBal.valueOf(), '1000');
        assert.equal(carolBal.valueOf(), '0');
    });

    it('should supply token transfers properly', async () => {
        await this.wasp.mint(alice, '100', { from: alice });
        await this.wasp.mint(bob, '1000', { from: alice });
        await this.wasp.transfer(carol, '10', { from: alice });
        await this.wasp.transfer(carol, '100', { from: bob });
        const totalSupply = await this.wasp.totalSupply();
        const aliceBal = await this.wasp.balanceOf(alice);
        const bobBal = await this.wasp.balanceOf(bob);
        const carolBal = await this.wasp.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '90');
        assert.equal(bobBal.valueOf(), '900');
        assert.equal(carolBal.valueOf(), '110');
    });

    it('should fail if you try to do bad transfers', async () => {
        await this.wasp.mint(alice, '100', { from: alice });
        await expectRevert(
            this.wasp.transfer(carol, '110', { from: alice }),
            'ERC20: transfer amount exceeds balance',
        );
        await expectRevert(
            this.wasp.transfer(carol, '1', { from: bob }),
            'ERC20: transfer amount exceeds balance',
        );
    });
  });
