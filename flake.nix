{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1.*.tar.gz";
    nixpkgs-unstable.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, nixpkgs-unstable }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
        pkgs-unstable = import nixpkgs-unstable { inherit system; };
      });
    in
    {
      devShells = forEachSupportedSystem ({ pkgs, pkgs-unstable }: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            node2nix
            nodejs
            nodePackages.pnpm
            pkgs-unstable.better-commits
          ];
        };
      });
    };
}
