const { assert } = require('chai')

var chai = require('chai')
    .use(require('chai-as-promised'))
    .should()

const { ethers } = require("hardhat");


// TODO: Payment token needs to be tested THOROUGHLY tested.
//      cases: no payment token
//             native payment
//             1155 payment
// TODO: State var updates
// TODO: Withdrawing ETH and ERC1155
// TODO: Subscription Implementation
// TODO: Batch functions
// TODO: Make every array field batchable
// TODO: Should there be an ERC20 payment type?

describe("BadgerV3", function() {
    before(async() => {
        [owner, signer1, userSigner, leaderSigner, sigSigner] = await ethers.getSigners();

        const BadgerSash = await ethers.getContractFactory("BadgerSash");
        sashMaster = await BadgerSash.deploy();
        sashMaster = await sashMaster.deployed();

        const BadgerHouse = await ethers.getContractFactory("BadgerHouse");
        house = await BadgerHouse.deploy(sashMaster.address);
        house = await house.deployed();

        // why tf is this failing.... Might just use one instance of sashPress for this.
        // const Mock1155 = ethers.getContractFactory("MockERC1155")
        // mock1155 = await Mock1155.deploy("testuri");
        // mock1155 = await mock1155.deployed();
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

        it('Badges have correct URI', async() => {
            let uri = await sashPress.uri(0)
            assert.equal(uri, "https://badger.utc24.io/0")
            uri = await sashPress.uri(1);
            let lowercaseAddress = sashPress.address.toLowerCase();
            assert.equal(uri, "https://badger.utc24.io/api/?seed=" + lowercaseAddress + "1")
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

        it('Can batch mint and revoke', async() => {
            await sashPress.connect(owner).leaderMintBatch(
                [signer1.address, userSigner.address],
                0,
                [1, 2],
                "0x"
            );
            assert.equal(await sashPress.balanceOf(signer1.address, 0), 2);
            assert.equal(await sashPress.balanceOf(userSigner.address, 0), 2);

            await sashPress.connect(owner).revokeBatch(
                [signer1.address, userSigner.address],
                0,
                [1, 2]
            )
            assert.equal(await sashPress.balanceOf(signer1.address, 0), 1);
            assert.equal(await sashPress.balanceOf(userSigner.address, 0), 0);
        })
        it('Cannot move soul bound', async() => {
            await sashPress.connect(signer1).safeTransferFrom(
                signer1.address,
                userSigner.address,
                0,
                1,
                "0x"
            ).should.be.revertedWith("BadgeSash::safeTransferFrom: Missing the proper transfer permissions.")
        })
        // it('Leader can move soulbound', async() => {
        //     await sashPress.connect(leaderSigner).safeTransferFrom(
        //         signer1.address,
        //         userSigner.address,
        //         0,
        //         1,
        //         "0x"
        //     )
        //     assert.equal(await sashPress.balanceOf(signer1.address, 0), 0);
        //     assert.equal(await sashPress.balanceOf(userSigner.address, 0), 1);
        // })
    });

    describe("Security Tests", function() {
        it("User cannot create badge", async() => {

        })
        it("User cannot set leader", async() => {

        })
        it("User cannot set signer", async() => {

        })
        it("User cannot revoke", async() => {

        })
        it("User cannot create badge", async() => {

        })
        it("Leader cannot set leader", async() => {

        })
        it("Cannot initialize twice", async() => {

        })
        it("Cannot mint uncreated badge", async() => {

        })
        it("Batch transfer always reverts", async() => {

        })
    });

    describe("Native Payment Sash", function() {
        it('Initialized New Sash', async() => {
            cloneTx = await house.connect(owner).createSashPress("0x");
            cloneTx = await cloneTx.wait();
            
            sashPressAddress = cloneTx.events[0].address;
            sashPress = await sashMaster.attach(sashPressAddress);

            assert.equal(await sashPress.owner(), owner.address);
        });

        it('Sash Initialized.', async () => {
            assert.equal(await sashPress.owner(), owner.address)
        })

        it('Can create Sash', async() => {
            const _badgeId = 0;
            const _paymentToken = [
                0,                          // enum TOKEN_TYPE
                signer1.address,            // address tokenAddress
                0,                          // uint256 tokenId
                100                         // uint256 quantity
            ]
            
            await sashPress.connect(owner).setBadge(
                  _badgeId                      //   uint256 _id
                , false                         // , bool _accountBound
                , sigSigner.address             // , address _signer
                , "https://badger.utc24.io/0"   // , string memory _uri
                , _paymentToken                 // , paymentToken memory _paymentToken
                , [leaderSigner.address]        // , address[] memory _leaders
            )

            const { signer } = await sashPress.badges(0);

            assert.equal(signer.toString(), sigSigner.address);
        });

        it('Owner can designate leader', async() => {
            await sashPress.setLeaders(0, [leaderSigner.address, signer1.address], [true, true]);

            assert.equal(await sashPress.isLeader(0, leaderSigner.address), true);
            assert.equal(await sashPress.isLeader(0, signer1.address), true);
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
                , { value: 100 }
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

        it('Can batch mint and revoke', async() => {
            await sashPress.connect(owner).leaderMintBatch(
                [signer1.address, userSigner.address],
                0,
                [1, 2],
                "0x"
            );
            assert.equal(await sashPress.balanceOf(signer1.address, 0), 2);
            assert.equal(await sashPress.balanceOf(userSigner.address, 0), 2);

            await sashPress.connect(owner).revokeBatch(
                [signer1.address, userSigner.address],
                0,
                [2, 2]
            )
            assert.equal(await sashPress.balanceOf(signer1.address, 0), 0);
            assert.equal(await sashPress.balanceOf(userSigner.address, 0), 0);
        })
    });

    // WTF why is 1155 deploy failing
    // describe("1155 Payment Sash", function() {
    //     it('Initialized New Sash', async() => {
    //         cloneTx = await house.connect(owner).createSashPress("0x");
    //         cloneTx = await cloneTx.wait();
            
    //         sashPressAddress = cloneTx.events[0].address;
    //         sashPress = await sashMaster.attach(sashPressAddress);

    //         assert.equal(await sashPress.owner(), owner.address);
    //     });

    //     it('Sash and Mock1155 Deployed.', async () => {
    //         assert.equal(await sashPress.owner(), owner.address)
    //         assert.equal(await mock1155.uri(), "testuri/");
    //     })

    //     it('Can create Sash', async() => {
    //         const _badgeId = 0;
    //         const _paymentToken = [
    //             0,                          // enum TOKEN_TYPE
    //             signer1.address,            // address tokenAddress
    //             0,                          // uint256 tokenId
    //             0                           // uint256 quantity
    //         ]
            
    //         await sashPress.connect(owner).setBadge(
    //               _badgeId                      //   uint256 _id
    //             , true                          // , bool _accountBound
    //             , signer1.address               // , address _signer
    //             , "https://badger.utc24.io/0"   // , string memory _uri
    //             , _paymentToken                 // , paymentToken memory _paymentToken
    //             , []                            // , address[] memory _leaders
    //         )

    //         const { signer } = await sashPress.badges(0);

    //         assert.equal(signer.toString(), signer1.address);
    //     });

    //     it('Badges have correct URI', async() => {
    //         let uri = await sashPress.uri(0)
    //         assert.equal(uri, "https://badger.utc24.io/0")
    //         uri = await sashPress.uri(1);
    //         let lowercaseAddress = sashPress.address.toLowerCase();
    //         assert.equal(uri, "https://badger.utc24.io/api/?seed=" + lowercaseAddress + "1")
    //     })

    //     it('Owner can designate leader', async() => {
    //         await sashPress.setLeaders(0, [leaderSigner.address, signer1.address], [true, true]);

    //         assert.equal(await sashPress.isLeader(0, leaderSigner.address), true);
    //         assert.equal(await sashPress.isLeader(0, signer1.address), true);
    //     });

    //     it('Owner can revoke leader', async() => {
    //         await sashPress.setLeaders(0, [signer1.address], [false]);

    //         assert.equal(await sashPress.isLeader(0, signer1.address), false);
    //     });

    //     it('Leader and user cannot designate leader', async() => {
    //         await sashPress.connect(leaderSigner).setLeaders(
    //             0, [signer1.address], [true]
    //         ).should.be.revertedWith("Ownable: caller is not the owner");
    //         await sashPress.connect(signer1).setLeaders(
    //             0, [signer1.address], [true]
    //         ).should.be.revertedWith("Ownable: caller is not the owner");
    //     });

    //     it('Leader can mint', async() => {
    //         const _badgeId = 0;
    //         const _amount = 1;

    //         await sashPress.connect(leaderSigner).leaderMint(
    //               userSigner.address
    //             , _badgeId
    //             , _amount
    //             , "0x"
    //         )

    //         assert.equal(await sashPress.balanceOf(userSigner.address, _badgeId), _amount)
    //     });

    //     it('Leader can revoke', async() => {
    //         const _badgeId = 0;
    //         const _amount = 1;
    //         const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);

    //         await sashPress.connect(leaderSigner).revoke(
    //               userSigner.address
    //             , _badgeId
    //             , _amount
    //         )

    //         const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
    //         assert.equal(balanceAfter.toString(), (balanceBefore.sub(_amount)).toString())
    //     });

    //     it('Owner can airdrop mint', async() => {
    //         const _badgeId = 0;
    //         const _amount = 1;
    //         const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);
            
    //         await sashPress.connect(owner).leaderMintBatch(
    //                 [userSigner.address, signer1.address]
    //             , _badgeId
    //             , [_amount, _amount]
    //             , "0x"
    //         )
            
    //         const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
    //         assert.equal(balanceAfter.toString(), (balanceBefore.add(_amount)).toString())
    //     });
            
    //     it('Owner can revoke', async() => {
    //         const _badgeId = 0;
    //         const _amount = 1;
    //         const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);
            
    //         await sashPress.connect(owner).revoke(
    //                 userSigner.address
    //             , _badgeId
    //             , _amount
    //         )
                
    //         const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
    //         assert.equal(balanceAfter.toString(), (balanceBefore.sub(_amount)).toString())
    //     });

    //     it('Admin and Leaders can set signer', async() => {
    //         await sashPress.connect(owner).setSigner(
    //             0,
    //             owner.address
    //         )

    //         const { signer: signer1 } = await sashPress.badges(0);

    //         assert.equal(signer1.toString(), owner.address);

    //         await sashPress.connect(owner).setSigner(
    //             0,
    //             sigSigner.address
    //         )

    //         const { signer: signer2 } = await sashPress.badges(0);

    //         assert.equal(signer2.toString(), sigSigner.address);
    //     });

    //     it('Users cannot set signer', async() => {
    //         await sashPress.connect(userSigner).setSigner(
    //             0,
    //             signer1.address
    //         ).should.be.revertedWith("BadgeSash::onlyLeader: Only leaders can call this.")
    //     });

    //     it('User can claim', async() => {
    //         const _badgeId = 0;
    //         const _quantity = 1;

    //         const messageHash = ethers.utils.solidityKeccak256(
    //             ["address", "uint256", "uint256"], 
    //             [userSigner.address, _badgeId, _quantity]
    //         )

    //         const messageHashArrayify = ethers.utils.arrayify(messageHash);

    //         const _signature = await sigSigner.signMessage(messageHashArrayify);

    //         await sashPress.connect(userSigner).claimMint(
    //               _signature        // bytes calldata _signature
    //             , _badgeId          // uint256 _id
    //             , _quantity         // uint256 _quantity
    //             , "0x"              // bytes memory _data
    //         );
    //     });

    //     it('User can revoke own badge', async() => {
    //         const _badgeId = 0;
    //         const _quantity = 1;
    //         const balanceBefore = await sashPress.balanceOf(userSigner.address, _badgeId);

    //         await sashPress.connect(userSigner).forfeit(
    //             _badgeId,
    //             _quantity
    //         )

    //         const balanceAfter = await sashPress.balanceOf(userSigner.address, _badgeId);
    //         assert.equal(balanceAfter, balanceBefore - _quantity)
    //     });

    //     it('Can batch mint and revoke', async() => {
    //         await sashPress.connect(owner).leaderMintBatch(
    //             [signer1.address, userSigner.address],
    //             0,
    //             [1, 2],
    //             "0x"
    //         );
    //         assert.equal(await sashPress.balanceOf(signer1.address, 0), 2);
    //         assert.equal(await sashPress.balanceOf(userSigner.address, 0), 2);

    //         await sashPress.connect(owner).revokeBatch(
    //             [signer1.address, userSigner.address],
    //             0,
    //             [2, 2]
    //         )
    //         assert.equal(await sashPress.balanceOf(signer1.address, 0), 0);
    //         assert.equal(await sashPress.balanceOf(userSigner.address, 0), 0);
    //     })
    // });
})