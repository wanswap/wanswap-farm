const { expectRevert, time } = require('@openzeppelin/test-helpers');
const WaspToken = artifacts.require('WaspToken');
const WanSwapFarm = artifacts.require('WanSwapFarm');
const MockERC20 = artifacts.require('MockERC20');

contract('WanSwapFarm', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.wasp = await WaspToken.new({ from: alice });
    });

    it('should set correct state variables', async () => {
        this.farm = await WanSwapFarm.new(this.wasp.address, dev, '1000', '0', '100', '1000', '10000', { from: alice });
        await this.wasp.transferOwnership(this.farm.address, { from: alice });
        const wasp = await this.farm.wasp();
        const devaddr = await this.farm.devaddr();
        const owner = await this.wasp.owner();
        assert.equal(wasp.valueOf(), this.wasp.address);
        assert.equal(devaddr.valueOf(), dev);
        assert.equal(owner.valueOf(), this.farm.address);
    });

    it('should allow dev and only dev to update dev', async () => {
        this.farm = await WanSwapFarm.new(this.wasp.address, dev, '1000', '0', '100', '1000', '10000', { from: alice });
        assert.equal((await this.farm.devaddr()).valueOf(), dev);
        await expectRevert(this.farm.dev(bob, { from: bob }), 'Should be dev address');
        await this.farm.dev(bob, { from: dev });
        assert.equal((await this.farm.devaddr()).valueOf(), bob);
        await this.farm.dev(alice, { from: bob });
        assert.equal((await this.farm.devaddr()).valueOf(), alice);
    })

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', 18, '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', 18, '10000000000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });

            this.lp3 = await MockERC20.new('LPToken3', 'LP3', 4, '10000000000', { from: minter });
            await this.lp3.transfer(alice, '1000', { from: minter });
            await this.lp3.transfer(bob, '1000', { from: minter });
            await this.lp3.transfer(carol, '1000', { from: minter });

            this.lp4 = await MockERC20.new('LPToken4', 'LP4', 8, '10000000000', { from: minter });
            await this.lp4.transfer(alice, '1000', { from: minter });
            await this.lp4.transfer(bob, '1000', { from: minter });
            await this.lp4.transfer(carol, '1000', { from: minter });
        });

        it('should allow emergency withdraw', async () => {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '100', '100', '1000', '10000', { from: alice });
            await this.farm.add('100', this.lp.address, false);
            await this.lp.approve(this.farm.address, '1000', { from: bob });
            await this.farm.deposit(0, '100', { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '900');
            await this.farm.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });

        it('should give out WASPs only after farming time', async () => {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '100', '100', '1000', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.farm.add('100', this.lp.address, true);
            await this.farm.set(0, '50', true);
            await this.farm.set(0, '100', false);
            await this.lp.approve(this.farm.address, '1000', { from: bob });
            await this.farm.deposit(0, '100', { from: bob });
            await time.advanceBlockTo('89');
            await this.farm.deposit(0, '0', { from: bob }); // block 90
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('94');
            await this.farm.deposit(0, '0', { from: bob }); // block 95
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('99');
            await this.farm.deposit(0, '0', { from: bob }); // block 100
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('100');
            await this.farm.deposit(0, '0', { from: bob }); // block 101
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '500');
            await time.advanceBlockTo('104');
            await this.farm.deposit(0, '0', { from: bob }); // block 105
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '2500');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '125');
            assert.equal((await this.wasp.totalSupply()).valueOf(), '2625');
        });

        it('should not distribute WASPs if no one deposit', async () => {
            // 100 per block farming rate starting at block 200 with bonus until block 1000
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '200', '200', '1000', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.farm.add('100', this.lp.address, true);
            await this.lp.approve(this.farm.address, '1000', { from: bob });
            await time.advanceBlockTo('199');
            assert.equal((await this.wasp.totalSupply()).valueOf(), '0');
            await time.advanceBlockTo('204');
            assert.equal((await this.wasp.totalSupply()).valueOf(), '0');
            await time.advanceBlockTo('209');
            await this.farm.deposit(0, '10', { from: bob }); // block 210
            assert.equal((await this.wasp.totalSupply()).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '0');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '990');
            await time.advanceBlockTo('219');
            await this.farm.withdraw(0, '10', { from: bob }); // block 220
            assert.equal((await this.wasp.totalSupply()).valueOf(), '5250');
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '5000');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '250');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });

        it('should distribute WASPs properly for each staker', async () => {
            // 100 per block farming rate starting at block 300 with bonus until block 1000
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '300', '300', '1000', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.farm.add('100', this.lp.address, true);
            await this.lp.approve(this.farm.address, '1000', { from: alice });
            await this.lp.approve(this.farm.address, '1000', { from: bob });
            await this.lp.approve(this.farm.address, '1000', { from: carol });
            // Alice deposits 10 LPs at block 310
            await time.advanceBlockTo('309');
            await this.farm.deposit(0, '10', { from: alice });
            // Bob deposits 20 LPs at block 314
            await time.advanceBlockTo('313');
            await this.farm.deposit(0, '20', { from: bob });
            // Carol deposits 30 LPs at block 318
            await time.advanceBlockTo('317');
            await this.farm.deposit(0, '30', { from: carol });
            // Alice deposits 10 more LPs at block 320. At this point:
            //   Alice should have: 4*5*100 + 4*5*1/3*100 + 2*5*1/6*100 = 2833
            //   Bob should have: 4*5*2/3*100 + 2*5*2/6*100 = 1666
            //   Carol should have: 2*5*3/6*100 = 500
            //   WanSwapFarm should have the remaining: 5250 - 250 - 2833 = 2417
            await time.advanceBlockTo('319')
            await this.farm.deposit(0, '10', { from: alice });
            assert.equal((await this.wasp.totalSupply()).valueOf(), '5250');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '2833');
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(this.farm.address)).valueOf(), '2167');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '250');
            // Bob withdraws 5 LPs at block 330. At this point:
            //   Bob should have: 4*5*2/3*100 + 2*5*2/6*100 + 10*5*2/7*100 = 3095
            await time.advanceBlockTo('329')
            await this.farm.withdraw(0, '5', { from: bob });
            assert.equal((await this.wasp.totalSupply()).valueOf(), '10500');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '2833');
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '3095');
            assert.equal((await this.wasp.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(this.farm.address)).valueOf(), '4072');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '500');
            // Alice withdraws 20 LPs at block 340.
            // Bob withdraws 15 LPs at block 350.
            // Carol withdraws 30 LPs at block 360.
            await time.advanceBlockTo('339')
            await this.farm.withdraw(0, '20', { from: alice });
            await time.advanceBlockTo('349')
            await this.farm.withdraw(0, '15', { from: bob });
            await time.advanceBlockTo('359')
            await this.farm.withdraw(0, '30', { from: carol });
            assert.equal((await this.wasp.totalSupply()).valueOf(), '26250');
            assert.equal((await this.wasp.balanceOf(dev)).valueOf(), '1250');
            // Alice should have: 2833 + 10*5*2/7*100 + 10*5*2/6.5*100 = 5800
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '5800');
            // Bob should have: 3095 + 10*5*1.5/6.5*100 + 10*5*1.5/4.5*100 = 5915
            assert.equal((await this.wasp.balanceOf(bob)).valueOf(), '5915');
            // Carol should have: 2*5*3/6*100 + 10*5*3/7*100 + 10*5*3/6.5*100 + 10*5*3/4.5*100 + 10*5*100 = 13284
            assert.equal((await this.wasp.balanceOf(carol)).valueOf(), '13284');
            // All of them should have 1000 LPs back.
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(carol)).valueOf(), '1000');

            let poolLength = await this.farm.poolLength();
            console.log('poolLength', poolLength);

        });

        it('should give proper WASPs allocation to each pool', async () => {
            // 100 per block farming rate starting at block 400 with bonus until block 1000
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '400', '400', '1000', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '1000', { from: alice });
            await this.lp2.approve(this.farm.address, '1000', { from: bob });
            // Add first LP to the pool with allocation 1
            await this.farm.add('10', this.lp.address, true);
            // Alice deposits 10 LPs at block 410
            await time.advanceBlockTo('409');
            await this.farm.deposit(0, '10', { from: alice });
            // Add LP2 to the pool with allocation 2 at block 420
            await time.advanceBlockTo('419');
            await this.farm.add('20', this.lp2.address, true);
            // Alice should have 10*5*100 pending reward
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '5000');
            // Bob deposits 10 LP2s at block 425
            await time.advanceBlockTo('424');
            await this.farm.deposit(1, '5', { from: bob });
            // Alice should have 5000 + 5*5*1/3*100 = 5833 pending reward
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '5833');
            await time.advanceBlockTo('430');
            // At block 430. Bob should get 5*5*2/3*100 = 1666.
            // At block 430. Alice should get 5833 + 5*5*1/3*100 = 6666.
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '6666');
            assert.equal((await this.farm.pendingWasp(1, bob)).valueOf(), '1666');
        });

        it('should stop giving bonus WASPs after the bonus period ends', async () => {
            // 100 per block farming rate starting at block 500 with bonus until block 600
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '500', '500', '600', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '1000', { from: alice });
            await this.farm.add('1', this.lp.address, true);
            // Alice deposits 10 LPs at block 590
            await time.advanceBlockTo('589');
            await this.farm.deposit(0, '10', { from: alice });
            // At block 605, she should have 10*5*100 + 5*1*100 = 5500 pending.
            await time.advanceBlockTo('605');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '5500');
            // At block 606, Alice withdraws all pending rewards and should get 5600.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '5600');
        });

        it('state test 1', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '600', '800', '1000', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('699');
            // Alice deposits 10 LPs at block 700
            await this.farm.deposit(0, '10', { from: alice });
            // At block 810, Alice should have 100*1*100 + 10*5*100 = 15000 pending.
            await time.advanceBlockTo('810');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '15000');

            // At block 811, Alice withdraws all pending rewards and should get 15500.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '15500');
        });

        it('state test 2', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '900', '910', '920', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('919');
            // Alice deposits 10 LPs at block 920
            await this.farm.deposit(0, '10', { from: alice });
            // At block 930, she should have 10*100 = 1000 pending.
            await time.advanceBlockTo('930');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '1000');

            // At block 811, Alice withdraws all pending rewards and should get 21000.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '1100');
        });

        it('state test 3', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '1000', '1010', '1020', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('1014');
            // Alice deposits 10 LPs at block 1015
            await this.farm.deposit(0, '10', { from: alice });
            // she should have 5000 pending.
            await time.advanceBlockTo('1020');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '2500');

            // Alice withdraws all pending rewards and should get 2600.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '2600');
        });

        it('state test 4', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '1100', '1110', '1120', '10000', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('1104');
            // Alice deposits 10 LPs at block 1105
            await this.farm.deposit(0, '10', { from: alice });
            // she should have 5*100 + 10*5*100 + 10*100 = 6500 pending.
            await time.advanceBlockTo('1130');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '6500');

            // Alice withdraws all pending rewards and should get 6600.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '6600');
        });

        it('state test 5', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '1135', '1140', '1150', '1200', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('1205');
            // Alice deposits 10 LPs at block 1105
            await this.farm.deposit(0, '10', { from: alice });
            await time.advanceBlockTo('1210');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');

            // Alice withdraws all pending rewards and should get 5800.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '0');
        });

        it('state test 6', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '1300', '1310', '1320', '1400', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '100000', { from: alice });
            await this.farm.add('1', this.lp.address, true);

            await time.advanceBlockTo('1389');
            // Alice deposits 10 LPs at block 1390
            await this.farm.deposit(0, '10', { from: alice });
            // she should have 10*100 = 1000 pending.
            await time.advanceBlockTo('1410');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '1000');

            // Alice withdraws all pending rewards and should get 5800.
            await this.farm.deposit(0, '0', { from: alice });
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '0');
            assert.equal((await this.wasp.balanceOf(alice)).valueOf(), '1000');
        });

        it('multi-decimal test', async () => {
            this.farm = await WanSwapFarm.new(this.wasp.address, dev, '100', '1500', '1500', '1600', '1700', { from: alice });
            await this.wasp.transferOwnership(this.farm.address, { from: alice });
            await this.lp.approve(this.farm.address, '10000000000', { from: alice });
            await this.lp3.approve(this.farm.address, '10000000000', { from: bob });
            await this.lp4.approve(this.farm.address, '10000000000', { from: carol });
            await this.lp4.approve(this.farm.address, '10000000000', { from: dev });

            await this.farm.add('10', this.lp.address, true);
            await this.farm.add('10', this.lp3.address, true);
            await this.farm.add('10', this.lp4.address, true);
            await this.farm.add('10', this.lp2.address, true);


            await this.lp.transfer(alice, '1000000000', { from: minter });
            await this.lp3.transfer(bob, '1000000000', { from: minter });
            await this.lp4.transfer(carol, '1000000000', { from: minter });
            await this.lp4.transfer(dev, '1000000000', { from: minter });


            await time.advanceBlockTo('1499');
            // Alice deposits 10 LPs at block 1390
            await this.farm.deposit(0, '1000000', { from: alice }); //1500
            await this.farm.deposit(1, '10000', { from: bob }); //1501
            await this.farm.deposit(2, '10', { from: carol });  //1502
            await this.farm.deposit(2, '10', { from: dev });    //1503


            // she should have 100*1000 = 100000 pending.
            await time.advanceBlockTo('1600');
            assert.equal((await this.farm.pendingWasp(0, alice)).valueOf(), '12500');
            assert.equal((await this.farm.pendingWasp(1, bob)).valueOf(), '12375');
            assert.equal((await this.farm.pendingWasp(2, carol)).valueOf(), '6187');
            assert.equal((await this.farm.pendingWasp(2, dev)).valueOf(), '6062');
        });
    });
});
