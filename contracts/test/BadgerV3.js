const { assert } = require('chai')

var chai = require('chai')
    .use(require('chai-as-promised'))
    .should()

const { ethers } = require("hardhat");


// TODO: Payment token needs to be tested THOROUGHLY tested.
//      cases: no payment token
//             eth payment
//             1155 payment
// TODO: State var updates
// TODO: Withdrawing ETH and ERC1155
// TODO: Subscription Implementation
// TODO: URI
// TODO: Batch functions
// TODO: Fail tests
//       onlySewnBadge
//       onlyLeader
// TODO: Make every array field batchable

describe("BadgerV3", function() {
    before(async() => {
        [owner, signer1, userSigner, leaderSigner, sigSigner] = await ethers.getSigners();

        const BadgerSash = await ethers.getContractFactory("BadgerSash");
        sashMaster = await BadgerSash.deploy();
        sashMaster = await sashMaster.deployed();

        const BadgerHouse = await ethers.getContractFactory("BadgerHouse");
        house = await BadgerHouse.deploy(sashMaster.address);
        house = await house.deployed();
    });

    describe("No Payment Sash", function() {
        it('Initialized New Sash', async() => {
            cloneTx = await house.connect(owner).createSashPress("0x");
            cloneTx = await cloneTx.wait();
            
            sashPressAddress = cloneTx.events[0].address;
            sashPress = await sashMaster.attach(sashPressAddress);

            assert.equal(await sashPress.owner(), owner.address);
        });

        it('Can create Sash', async() => {
            const _badgeId = 0;
            const _paymentToken = [
                0,                          // enum TOKEN_TYPE
                signer1.address,            // address tokenAddress
                0,                          // uint256 tokenId
                0                           // uint256 quantity
            ]
            
            await sashPress.connect(owner).setBadge(
                  _badgeId                      //   uint256 _id
                , true                          // , bool _accountBound
                , signer1.address               // , address _signer
                , "https://badger.utc24.io/0"   // , string memory _uri
                , _paymentToken                 // , paymentToken memory _paymentToken
                , []                            // , address[] memory _leaders
            )

            const { signer } = await sashPress.badges(0);

            assert.equal(signer.toString(), signer1.address);
        });

        it('Badge has correct URI', async() => {
            let uri = await sashPress.uri(0)
            assert.equal(uri, "https://badger.utc24.io/0")
            console.log(await sashPress.uri(1));
        })

        it('Owner can designate leader', async() => {
            await sashPress.setLeaders(0, [leaderSigner.address, signer1.address], [true, true]);

            assert.equal(await sashPress.isLeader(0, leaderSigner.address), true);
            assert.equal(await sashPress.isLeader(0, signer1.address), true);
        });

        it('Owner can revoke leader', async() => {
            await sashPress.setLeaders(0, [signer1.address], [false]);

            assert.equal(await sashPress.isLeader(0, signer1.address), false);
        });

        it('Leader and user cannot designate leader', async() => {
            await sashPress.connect(leaderSigner).setLeaders(
                0, [signer1.address], [true]
            ).should.be.revertedWith("Ownable: caller is not the owner");
            await sashPress.connect(signer1).setLeaders(
                0, [signer1.address], [true]
            ).should.be.revertedWith("Ownable: caller is not the owner");
        });

        it('Leader can mint', async() => {
            const _badgeId = 0;
            const _amount = 1;

            await sashPress.connect(leaderSigner).leaderMint(
                  userSigner.address
                , _badgeId
                , _amount
                , "0x"
            )

            assert.equal(await sashPress.balanceOf(userSigner.address, _badgeId), _amount)
        });

        it('Leader can revoke', async() => {
            const _badgeId = 0;
            const _amount = 1;
            const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);

            await sashPress.connect(leaderSigner).revoke(
                  userSigner.address
                , _badgeId
                , _amount
            )

            const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
            assert.equal(balanceAfter.toString(), (balanceBefore.sub(_amount)).toString())
        });

        it('Owner can airdrop mint', async() => {
            const _badgeId = 0;
            const _amount = 1;
            const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);
            
            await sashPress.connect(owner).leaderMintBatch(
                    [userSigner.address, signer1.address]
                , _badgeId
                , [_amount, _amount]
                , "0x"
            )
            
            const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
            assert.equal(balanceAfter.toString(), (balanceBefore.add(_amount)).toString())
        });
            
        it('Owner can revoke', async() => {
            const _badgeId = 0;
            const _amount = 1;
            const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);
            
            await sashPress.connect(owner).revoke(
                    userSigner.address
                , _badgeId
                , _amount
            )
                
            const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
            assert.equal(balanceAfter.toString(), (balanceBefore.sub(_amount)).toString())
        });

        it('Admin and Leaders can set signer', async() => {
            await sashPress.connect(owner).setSigner(
                0,
                owner.address
            )

            const { signer: signer1 } = await sashPress.badges(0);

            assert.equal(signer1.toString(), owner.address);

            await sashPress.connect(owner).setSigner(
                0,
                sigSigner.address
            )

            const { signer: signer2 } = await sashPress.badges(0);

            assert.equal(signer2.toString(), sigSigner.address);
        });

        it('Users cannot set signer', async() => {
            await sashPress.connect(userSigner).setSigner(
                0,
                signer1.address
            ).should.be.revertedWith("BadgeSash::onlyLeader: Only leaders can call this.")
        });

        it('User can claim', async() => {
            const _badgeId = 0;
            const _quantity = 1;

            const messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"], 
                [userSigner.address, _badgeId, _quantity]
            )

            const messageHashArrayify = ethers.utils.arrayify(messageHash);

            const _signature = await sigSigner.signMessage(messageHashArrayify);

            await sashPress.connect(userSigner).claimMint(
                  _signature        // bytes calldata _signature
                , _badgeId          // uint256 _id
                , _quantity         // uint256 _quantity
                , "0x"              // bytes memory _data
            );
        });

        it('User can revoke own badge', async() => {
            const _badgeId = 0;
            const _quantity = 1;
            const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);

            await sashPress.connect(userSigner).forfeit(
                _badgeId,
                _quantity
            )

            const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
            assert.equal(balanceAfter, balanceBefore - _quantity)
        });
    });

    describe("", function() {

    });

    describe("ETH Payment Sash", function() {
        
    });
})